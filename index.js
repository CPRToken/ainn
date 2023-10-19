require('dotenv').config();
const { twitterClient } = require("./twitterClient.js");
const OpenAI = require('openai');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');


const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // Get API key from .env
const openai = new OpenAI({ key: process.env.OPENAI_API_KEY });




async function downloadImage(url, path) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.promises.writeFile(path, buffer);
}


async function downloadVideo(url, path) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.promises.writeFile(path, buffer);
}


async function fetchMedia(query) {
    let PEXELS_API_URL;
    let responseType;

    const isFetchingVideo = Math.random() >= 0.5; // Randomly decide between fetching an image or a video

    if (isFetchingVideo) {
        PEXELS_API_URL = 'https://api.pexels.com/v1/videos/search';
        responseType = 'videos';
    } else {
        PEXELS_API_URL = 'https://api.pexels.com/v1/search';
        responseType = 'photos';
    }

    const ITEMS_TO_FETCH = 5;
    const response = await fetch(`${PEXELS_API_URL}?query=${query}&per_page=${ITEMS_TO_FETCH}`, {
        headers: {
            'Authorization': PEXELS_API_KEY
        }
    });

    const data = await response.json();

    if (responseType === 'videos' && data.videos && data.videos.length > 0) {
        const randomVideo = data.videos[Math.floor(Math.random() * data.videos.length)];
        const videoURL = randomVideo.video_files[0].link;

        return {
            type: 'video',
            url: videoURL.startsWith("//") ? `https:${videoURL}` : videoURL
        };

    } else if (data.photos && data.photos.length > 0) {
        const randomImage = data.photos[Math.floor(Math.random() * data.photos.length)];
        return {
            type: 'image',
            url: randomImage.src.large
        };
    } else {
        throw new Error('Failed to fetch media from Pexels.');
    }
}

// only used in the getGeneratedTweet function
        const prompts = [
            "Here are 10 ways to make money with AI at home.",
            "What's the latest in AI technology and how to make money with it?",
            "How is AI revolutionizing industries and what can we expect next?",
            "What role does AI play in shaping the jobs of the future, for big companies?",
            "Share insights on the relationship between AI and human creativity and how to monetize it.",
             "What are the potential risks of AI and not using it for small business?",
            "How is AI revolutionizing industries and what can we expect from workers?",
            "Discuss the impacts of AI in today's digital age and can anyone use it?.",
            "What role does AI play in shaping the jobs of the future?",
            "What's the intersection between AI and renewable energy solutions?",
            "How does AI contribute to personalized learning experiences? with examples",
            "Highlight the significance of AI in modern transportation.",
            "Share a perspective on AI-driven automation in manufacturing and safety.",
            "Discuss AI's role in financial forecasting and market predictions.",
             "Share insights on AI's influence in modern art and design.",
            "Will AI replace actors? Discuss the pros and cons.",
            "What are the key benefits of implementing AI in small businesses, and how can it increase profitability?",
            "Exploring the role of AI in streamlining customer support for small businesses – is it a profitable investment?",
            "How can AI-powered chatbots help small businesses improve customer engagement and generate revenue?",
            "What are the emerging AI trends in e-commerce, and how can small online businesses capitalize on them?",
            "The impact of AI-driven analytics on small business decision-making and profitability.",
            "AI in marketing: How can small businesses leverage AI tools to optimize their advertising campaigns and boost sales?",
            "The rise of AI-driven personalization in online shopping – opportunities for small e-commerce businesses.",
            "How are AI-powered recommendation systems transforming the way small businesses sell products or services?",
            "The role of AI in supply chain management for small businesses – cost savings and revenue generation.",
            "Exploring AI-driven content generation tools for small businesses – creating valuable content at scale.",
            "AI and cybersecurity: How can small businesses protect their data and profitability in the digital age?",
            "AI-powered financial forecasting for small businesses – improving budgeting and revenue projections.",
            "The use of AI in inventory management for small retailers – reducing costs and boosting profits.",
            "How can small businesses monetize their data using AI-driven analytics and insights?",
            "AI-driven pricing strategies for small businesses – optimizing pricing to maximize revenue.",
            "The role of AI in enhancing user experience on small business websites – driving conversions and sales.",
            "AI-driven personal assistants for small business owners – increasing productivity and revenue.",
            "Exploring AI-powered social media marketing for small businesses – reaching a wider audience and generating leads.",
            "The potential of AI in optimizing small business logistics and delivery operations for greater profitability.",
            "AI and voice technology – how can small businesses use voice assistants to improve customer service and sales?",

        ];


async function getGeneratedTweet() {
    try {
        // Randomly pick a prompt from the prompts array
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

        const response = await openai.completions.create({
            model: "gpt-3.5-turbo-instruct",
            prompt: randomPrompt,
            max_tokens: 200,
            temperature: 0.7
        });

        return response.choices[0].text.trim();
    } catch (error) {
        console.log("Error generating tweet:", error);
    }
}
const appendHashTagsAndMentions = (tweetContent) => {
    return `${tweetContent} #impuestos`
};



const trimToCompleteSentence = (tweet) => {
    if (tweet.length <= 280) return tweet;

    let lastValidEnd = tweet.lastIndexOf('.', 279);
    if (lastValidEnd === -1) lastValidEnd = tweet.lastIndexOf('!', 279);
    if (lastValidEnd === -1) lastValidEnd = tweet.lastIndexOf('?', 279);

    return lastValidEnd !== -1 ? tweet.substring(0, lastValidEnd + 1) : tweet.substring(0, 277) + "...";
};

const tweet = async () => {
    try {
        const tweetContent = await getGeneratedTweet();
        if (tweetContent) {
            const fullTweet = appendHashTagsAndMentions(tweetContent);
            const trimmedTweet = trimToCompleteSentence(fullTweet);

            // 1. Fetch the image URL for "AI" topic
            const mediaData = await fetchMedia("AI, technology, business, futuristic, future, innovation, machine learning, deep learning, artificial intelligence, data science, data, coding, programming, software, hardware, computer, internet, digital, tech, science, engineering, robotics");
            const filename = `ai_media_${Date.now()}`;

            let mediaId;

            if (mediaData.type === "image") {
                const localImagePath = `./media/${filename}.jpg`;
                await downloadImage(mediaData.url, localImagePath);
                mediaId = await twitterClient.v1.uploadMedia(localImagePath);
            } else {
                const localVideoPath = `./media/${filename}.mp4`;
                await downloadVideo(mediaData.url, localVideoPath);
                mediaId = await twitterClient.v1.uploadMedia(localVideoPath);
            }
            await twitterClient.v2.tweet({
                text: trimmedTweet,
                media: {
                    media_ids: [mediaId]
                }
            });
        } else {
            console.log("Failed to generate a tweet.");
        }
    } catch (e) {
        console.error("Error posting tweet:", e);
    }
};


// Schedule the tweet function to run every 10 minutes
cron.schedule('*/1 * * * *', tweet);



console.log("Started scheduler to tweet every 1 minutes.");

