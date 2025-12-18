const express = require("express");
const router = express.Router();

module.exports = (Task) => {
  // GET /api/task - Get all tasks
  router.get("/", async (req, res) => {
    try {
      const tasks = await Task.findAll({
        order: [["order_index", "ASC"]],
      });
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/task - Create a new task
  router.post("/", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ error: "Description is required" });
      }

      //place task at end of list
      const minOrder = (await Task.min("order_index")) || 0;
      const task = await Task.create({
        description,
        order_index: minOrder - 1,
      });
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/task/complete?id={id} - Mark a task as complete
  router.post("/complete", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Task ID is required" });
      }

      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      task.date_completed = new Date();
      await task.save();
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/task/delete?id={id} - Delete a task
  router.delete("/delete", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Task ID is required" });
      }

      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      await task.destroy();
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/order", async (req, res) => {
    res.json({ message: "needs implemented" });
  });

  // POST /api/task/edit - Edit a task description
  router.post("/edit", async (req, res) => {
    try {
      const { old_task_description, new_task_description } = req.body;
      if (!old_task_description || !new_task_description) {
        return res.status(400).json({
          error:
            "Both old_task_description and new_task_description are required",
        });
      }

      const task = await Task.findOne({
        where: { description: old_task_description },
      });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      task.description = new_task_description;
      await task.save();
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
