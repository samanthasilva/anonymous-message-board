const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite("Functional Tests", function () {
  
  test("Creating a new thread: POST request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .post("/api/threads/general")
      .send({ text: "My thread", delete_password: "password" })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        done();
      });
  });

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body, "response should be an array");
        assert.property(
          res.body[0],
          "text",
          "Threads in array should contain text"
        );
        assert.isAtMost(res.body.length, 10, "No more than 10 threads");
        assert.isAtMost(res.body[0].replies.length, 3, "No more than 3 replies");
        done();
      });
  });

  test("Reporting a thread: PUT request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        chai
          .request(server)
          .put("/api/threads/general")
          .send({ thread_id: threadId })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");  // Corrigido para "reported"
            done();
          });
      });
  });

  test("Creating a new reply: POST request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        chai
          .request(server)
          .post(`/api/replies/general`)
          .send({
            thread_id: threadId,
            text: "My Reply",
            delete_password: "password",
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            done();
          });
      });
  });

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        chai
          .request(server)
          .get(`/api/replies/general?thread_id=${threadId}`)
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body, "body should be an object");
            assert.property(res.body, "replies");
            assert.isArray(res.body.replies);
            done();
          });
      });
  });

  test("Reporting a reply: PUT request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        const replyId = res.body[0].replies[0]._id;
        chai
          .request(server)
          .put(`/api/replies/general`)
          .send({
            thread_id: threadId,
            reply_id: replyId,
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");  // Corrigido para "reported"
            done();
          });
      });
  });

  test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        const replyId = res.body[0].replies[0]._id;
        chai
          .request(server)
          .delete(`/api/replies/general`)
          .send({
            thread_id: threadId,
            reply_id: replyId,
            delete_password: "wrongpassword",
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password");  // Corrigido para "incorrect password"
            done();
          });
      });
  });

  test("Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        const replyId = res.body[0].replies[0]._id;
        chai
          .request(server)
          .delete(`/api/replies/general`)
          .send({
            thread_id: threadId,
            reply_id: replyId,
            delete_password: "password",
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");  // Corrigido para "success"
            done();
          });
      });
  });

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        chai
          .request(server)
          .delete("/api/threads/general")
          .send({ thread_id: threadId, delete_password: "wrong" })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password");  // Corrigido para "incorrect password"
            done();
          });
      });
  });

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", function (done) {
    chai
      .request(server)
      .get("/api/threads/general")
      .end(function (err, res) {
        const threadId = res.body[0]._id;
        chai
          .request(server)
          .delete("/api/threads/general")
          .send({ thread_id: threadId, delete_password: "password" })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");  // Corrigido para "success"
            done();
          });
      });
  });
});
