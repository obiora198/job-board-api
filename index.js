require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("./generated/prisma");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET;

// ==================== AUTH ====================
app.post("/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return res.status(400).json({ error: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role },
    });

    // generate token same as login
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
      expiresIn: "1d",
    });

    res.json({ token }); // return token
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Registration failed, try again" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
    expiresIn: "1d",
  });
  res.json({ token });
});

function auth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.sendStatus(401);
    try {
      const decoded = jwt.verify(header.split(" ")[1], SECRET);
      if (role && decoded.role !== role) return res.sendStatus(403);
      req.user = decoded;
      next();
    } catch {
      res.sendStatus(401);
    }
  };
}

// ==================== JOBS ====================
// Employer: create job
app.post("/jobs", auth("EMPLOYER"), async (req, res) => {
  const {
    title,
    description,
    country,
    city,
    applyLink,
    companyName,
    employmentType,
    salaryRange,
  } = req.body;

  try {
    const job = await prisma.job.create({
      data: {
        title,
        description,
        country,
        city,
        applyLink,
        companyName,
        employmentType,
        salaryRange,
        employerId: req.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // expires in 30 days
      },
    });

    res.json(job);
  } catch (err) {
    console.error("Error creating job:", err);
    res.status(500).json({ error: "Failed to create job" });
  }
});


// Employer: update their own job
app.put("/jobs/:id", auth("EMPLOYER"), async (req, res) => {
  try {
    const jobId = req.params.id;
    const {
      title,
      description,
      city,
      country,
      applyLink,
      employmentType,
      salaryRange,
      companyName,
    } = req.body;

    // Check if job belongs to this employer
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.employerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this job" });
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        description,
        city,
        country,
        applyLink,
        employmentType,
        salaryRange,
        companyName,
      },
    });

    res.json(updatedJob);
  } catch (err) {
    console.error("Error updating job:", err);
    res.status(500).json({ error: "Failed to update job" });
  }
});

app.delete("/jobs/:id", auth("EMPLOYER"), async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.employerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this job" });
    }
    await prisma.job.delete({ where: { id: jobId } });
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Admin: approve/reject
// Approve a job
app.put("/admin/jobs/:id/approve", auth("ADMIN"), async (req, res) => {
  const { id } = req.params;
  try {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    res.json(job);
  } catch (error) {
    console.error("Approve job failed:", error);
    res.status(400).json({ error: "Failed to approve job" });
  }
});

// Reject a job
app.put("/admin/jobs/:id/reject", auth("ADMIN"), async (req, res) => {
  const { id } = req.params;
  try {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    res.json(job);
  } catch (error) {
    console.error("Reject job failed:", error);
    res.status(400).json({ error: "Failed to reject job" });
  }
});


// Get all users (Admin only)
app.get("/admin/users", auth("ADMIN"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});


// Public: browse jobs
app.get("/jobs", async (req, res) => {
  try {
    const { keyword, country, city, status, datePosted } = req.query;

    // Build filter object
    const filters = {
      status: status || "APPROVED",
      expiresAt: { gt: new Date() },
    };

    if (keyword) {
      filters.OR = [
        { title: { contains: keyword, mode: undefined } },
        { companyName: { contains: keyword, mode: undefined } },
        { description: { contains: keyword, mode: undefined } },
      ];
    }

    if (country) filters.country = country;
    if (city) filters.city = city;

    // Filter by date posted
    if (datePosted) {
      const now = new Date();
      let since = null;

      if (datePosted === "last-24-hours") since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (datePosted === "last-7-days") since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (datePosted === "last-30-days") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (since) filters.createdAt = { gte: since };
    }

    const jobs = await prisma.job.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });

    res.json(jobs);
  } catch (err) {
    console.error("Error fetching jobs:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});


app.get("/jobs/mine", auth("EMPLOYER"), async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { employerId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(jobs);
  } catch (err) {
    console.error("Error fetching employer jobs:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

app.listen(process.env.PORT || 4000, () =>
  console.log("API running on http://localhost:4000")
);
