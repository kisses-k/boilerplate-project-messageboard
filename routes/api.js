'use strict';

const ThreadModel = require('../models').Thread;

module.exports = function (app) {

  app.route('/api/threads/:board')
    // 1. Create a Thread
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;

      const newThread = new ThreadModel({
        board: board,
        text: text,
        delete_password: delete_password,
        created_on: new Date(),
        bumped_on: new Date()
      });

      try {
        await newThread.save();
        res.redirect(`/b/${board}/`);
      } catch (err) {
        res.send("Error saving thread");
      }
    })

    // 2. View 10 most recent threads (with 3 replies each)
    .get(async (req, res) => {
      const board = req.params.board;
      try {
        // Find threads for board, sort by bumped_on desc, limit 10
        let threads = await ThreadModel.find({ board: board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .lean(); // .lean() converts Mongoose docs to plain JS objects

        // Transform data for privacy and requirements
        threads.forEach(thread => {
          thread.replycount = thread.replies.length;
          
          // Get only the last 3 replies
          thread.replies = thread.replies.slice(-3);

          // Remove sensitive info
          delete thread.delete_password;
          delete thread.reported;
          thread.replies.forEach(reply => {
            delete reply.delete_password;
            delete reply.reported;
          });
        });

        res.json(threads);
      } catch (err) {
        res.send("Error fetching threads");
      }
    })

    // 3. Delete a Thread
    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      try {
        const thread = await ThreadModel.findById(thread_id);
        if (!thread) return res.send("Thread not found");

        if (thread.delete_password === delete_password) {
          await ThreadModel.findByIdAndDelete(thread_id);
          res.send("success");
        } else {
          res.send("incorrect password");
        }
      } catch (err) {
        res.send("incorrect password"); // Catch malformed IDs
      }
    })

    // 4. Report a Thread
    .put(async (req, res) => {
      const { thread_id } = req.body; // or req.body.report_id per tests sometimes
      try {
        await ThreadModel.findByIdAndUpdate(thread_id, { reported: true });
        res.send("reported");
      } catch (err) {
        res.send("error reporting");
      }
    });

  // -------------------------------------------------------

  app.route('/api/replies/:board')
    // 5. Create a Reply
    .post(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;
      const date = new Date();

      const newReply = {
        text: text,
        delete_password: delete_password,
        created_on: date,
        reported: false
      };

      try {
        // Find thread, push reply, update bumped_on
        await ThreadModel.findByIdAndUpdate(thread_id, {
          $push: { replies: newReply },
          $set: { bumped_on: date }
        });
        
        res.redirect(`/b/${req.params.board}/${thread_id}`);
      } catch (err) {
        res.send("Error posting reply");
      }
    })

    // 6. View a single thread with all replies
    .get(async (req, res) => {
      const thread_id = req.query.thread_id;
      try {
        const thread = await ThreadModel.findById(thread_id).lean();
        if (!thread) return res.send("Error loading thread");

        // Remove sensitive info
        delete thread.delete_password;
        delete thread.reported;
        thread.replies.forEach(reply => {
          delete reply.delete_password;
          delete reply.reported;
        });

        res.json(thread);
      } catch (err) {
        res.send("Error loading thread");
      }
    })

    // 7. Delete a Reply
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      try {
        const thread = await ThreadModel.findById(thread_id);
        if (!thread) return res.send("Thread not found");

        // Find the specific sub-document (reply)
        const reply = thread.replies.id(reply_id);
        
        if (reply && reply.delete_password === delete_password) {
          reply.text = "[deleted]"; // Do not delete, just change text
          await thread.save();
          res.send("success");
        } else {
          res.send("incorrect password");
        }
      } catch (err) {
        res.send("incorrect password");
      }
    })

    // 8. Report a Reply
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      try {
        const thread = await ThreadModel.findById(thread_id);
        if (!thread) return res.send("Thread not found");

        const reply = thread.replies.id(reply_id);
        if (reply) {
          reply.reported = true;
          await thread.save();
          res.send("reported");
        } else {
          res.send("Reply not found");
        }
      } catch (err) {
        res.send("error");
      }
    });

};