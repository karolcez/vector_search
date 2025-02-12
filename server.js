require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const VECTOR_LENGTH = 1536;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

const movieSchema = new mongoose.Schema({
    title: String,
    plot: String,
    year: Number,
    plot_embedding: [Number], 
});

const Movie = mongoose.model('Movie', movieSchema, 'embedded_movies');

const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
};
const findParams = { year: { $lt: 1950 }, plot_embedding: { $exists: true } };
app.post('/search', async (req, res) => {
    const { vector } = req.body;

    if (!vector || vector.length !== VECTOR_LENGTH) {
        return res.status(400).json({ error: `Invalid vector: Must be an array of length ${VECTOR_LENGTH}` });
    }

    try {
        const movies = await Movie.find(findParams).limit(100);

        const results = movies
            .map(movie => ({
                title: movie.title,
                plot: movie.plot,
                similarity: cosineSimilarity(vector, movie.plot_embedding),
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10); 

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
