const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  
  let testThreadId;
  let testReplyId;
  const board = 'fcc_test';

  test('Creating a new thread', function(done) {
    chai.request(server)
      .post(`/api/threads/${board}`)
      .send({ text: 'test text', delete_password: 'pass' })
      .redirects(0) // <--- Add this line: Prevent following the redirect
      .end(function(err, res) {
        // We expect a 302 Redirect, so err might be present depending on config,
        // but typically with .redirects(0) checking status 302 is safe.
        assert.equal(res.status, 302); 
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each', function(done) {
    chai.request(server)
      .get(`/api/threads/${board}`)
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        // Save ID for later tests
        testThreadId = res.body[0]._id; 
        done();
      });
  });

  test('Creating a new reply', function(done) {
    chai.request(server)
      .post(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, text: 'reply text', delete_password: 'pass' })
      .redirects(0) // <--- Add this line here too
      .end(function(err, res) {
        assert.equal(res.status, 302);
        done();
      });
  });

  test('Viewing a single thread with all replies', function(done) {
    chai.request(server)
      .get(`/api/replies/${board}`)
      .query({ thread_id: testThreadId })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body._id, testThreadId);
        // Save reply ID
        testReplyId = res.body.replies[res.body.replies.length - 1]._id;
        done();
      });
  });

  test('Deleting a reply with the incorrect password', function(done) {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'wrong' })
      .end(function(err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password', function(done) {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'pass' })
      .end(function(err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a reply', function(done) {
    chai.request(server)
      .put(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId })
      .end(function(err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Reporting a thread', function(done) {
    chai.request(server)
      .put(`/api/threads/${board}`)
      .send({ thread_id: testThreadId })
      .end(function(err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });
  
  test('Deleting a thread with the incorrect password', function(done) {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({ thread_id: testThreadId, delete_password: 'wrong' })
      .end(function(err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a thread with the correct password', function(done) {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({ thread_id: testThreadId, delete_password: 'pass' })
      .end(function(err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

});