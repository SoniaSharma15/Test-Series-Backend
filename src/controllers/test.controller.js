import Test from "../models/Test.js";

export const createTest = async (req, res) => {
  try {
    const created = await Test.create(req.body);
    return res.status(201).json(created);
  } catch (error) {
    // ✅ Mongoose validation errors should be 400
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};


/* Get Tests by Series */
export const getTestsBySeries = async (req, res) => {
  try {
    const tests = await Test.find({
      testSeriesId: req.params.seriesId,
    }).sort({ createdAt: -1 });

    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* Delete Test */
export const deleteTest = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ message: "Test deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTest = async (req, res) => {
  try {
    const { id } = req.params;

    const payload = {
      testSeriesId: req.body.testSeriesId,
      subject: req.body.subject,
      name: req.body.name,
      duration: req.body.duration,
      totalMarks: req.body.totalMarks,
      passingMarks: req.body.passingMarks,
      scheduledTime: req.body.scheduledTime,
    };

    const updated = await Test.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ message: "Test not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
