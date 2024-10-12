"use strict";
const mongoose = require("mongoose");
require('dotenv').config();

// Conexão ao MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
})
.then(() => console.log('Conectado ao MongoDB'))
.catch((err) => console.error('Erro na conexão MongoDB:', err));

// Esquemas do Mongoose
const replySchema = new mongoose.Schema({
  text: String,
  delete_password: String,
  reported: { type: Boolean, default: false },
  created_on: { type: Date, default: Date.now }
});

const threadSchema = new mongoose.Schema({
  board: String,
  text: String,
  delete_password: String,
  reported: { type: Boolean, default: false },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  replies: [replySchema]
});

const Thread = mongoose.model("Thread", threadSchema);

module.exports = function (app) {
  
  // Rota para manipulação de threads
  app.route("/api/threads/:board")
    // GET para visualizar os 10 threads mais recentes com até 3 replies
    .get(async function (req, res) {
      const board = req.params.board;
      try {
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .select('-delete_password -reported')
          .lean();

        threads.forEach(thread => {
          thread.replycount = thread.replies.length;
          thread.replies = thread.replies
            .sort((a, b) => b.created_on - a.created_on)
            .slice(0, 3)
            .map(reply => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on
            }));
        });

        res.json(threads);
      } catch (err) {
        res.status(500).send("Error fetching threads");
      }
    })
    
    // POST para criar um novo thread
    .post(async function (req, res) {
      const board = req.params.board;
      const { text, delete_password } = req.body;
      if (!text || !delete_password) {
        return res.status(400).send("Text and Delete Password are required.");
      }

      try {
        const newThread = new Thread({
          board,
          text,
          delete_password,
          replies: []
        });

        await newThread.save();
        res.redirect(`/b/${board}/`);
      } catch (err) {
        res.status(500).send("Error creating thread");
      }
    })

    // PUT para reportar um thread
    .put(async function (req, res) {
      const { thread_id } = req.body;
      if (!thread_id) {
        return res.status(400).send("Thread ID is required.");
      }

      try {
        const updatedThread = await Thread.findByIdAndUpdate(thread_id, { reported: true });
        if (!updatedThread) {
          return res.status(404).send("Thread not found.");
        }
        res.send("reported");
      } catch (err) {
        res.status(500).send("Error reporting thread");
      }
    })

    // DELETE para deletar um thread
    .delete(async function (req, res) {
      const { thread_id, delete_password } = req.body;
      if (!thread_id || !delete_password) {
        return res.status(400).send("Thread ID and Delete Password are required.");
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.status(404).send("Thread not found");

        if (thread.delete_password !== delete_password) {
          return res.send("incorrect password");
        }

        await Thread.findByIdAndDelete(thread_id);
        res.send("success");
      } catch (err) {
        res.status(500).send("Error deleting thread");
      }
    });

  // Rota para manipulação de replies
  app.route("/api/replies/:board")
    // GET para visualizar todas as replies de um thread
    .get(async function (req, res) {
      const threadId = req.query.thread_id;
      if (!threadId) {
        return res.status(400).send("Thread ID is required.");
      }

      try {
        const thread = await Thread.findById(threadId).select('-delete_password -reported');
        if (!thread) return res.status(404).send("Thread not found");

        const formattedThread = {
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: thread.replies.map(reply => ({
            _id: reply._id,
            text: reply.text,
            created_on: reply.created_on
          }))
        };

        res.json(formattedThread);
      } catch (err) {
        res.status(500).send("Error fetching replies");
      }
    })

    // POST para criar uma nova reply
    .post(async function (req, res) {
      const { thread_id, text, delete_password } = req.body;
      if (!thread_id || !text || !delete_password) {
        return res.status(400).send("Thread ID, Text, and Delete Password are required.");
      }

      try {
        const newReply = {
          text,
          delete_password,
          created_on: new Date()
        };

        const updatedThread = await Thread.findByIdAndUpdate(
          thread_id,
          {
            bumped_on: new Date(),
            $push: { replies: newReply }
          },
          { new: true }
        );

        if (!updatedThread) return res.status(404).send("Thread not found");

        const reply = updatedThread.replies[updatedThread.replies.length - 1];
        if (reply) {
          res.redirect(`/b/${updatedThread.board}/?new_reply_id=${reply._id}`);
        } else {
          res.status(500).send("Failed to add reply");
        }
      } catch (err) {
        res.status(500).send("Error posting reply");
      }
    })

    // PUT para reportar uma reply
    .put(async function (req, res) {
      const { thread_id, reply_id } = req.body;
      if (!thread_id || !reply_id) {
        return res.status(400).send("Thread ID and Reply ID are required.");
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.status(404).send("Thread not found");

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.status(404).send("Reply not found");

        reply.reported = true;
        await thread.save();

        res.send("reported");
      } catch (err) {
        res.status(500).send("Error reporting reply");
      }
    })

    // DELETE para deletar uma reply
    .delete(async function (req, res) {
      const { thread_id, reply_id, delete_password } = req.body;
      if (!thread_id || !reply_id || !delete_password) {
        return res.status(400).send("Thread ID, Reply ID and Delete Password are required.");
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.status(404).send("Thread not found");

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.status(404).send("Reply not found");

        if (reply.delete_password !== delete_password) {
          return res.send("incorrect password");
        }

        reply.text = "[deleted]";
        await thread.save();

        res.send("success");
      } catch (err) {
        res.status(500).send("Error deleting reply");
      }
    });
};
