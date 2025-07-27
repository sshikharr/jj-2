import { GoogleGenerativeAI } from "@google/generative-ai";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const fs = require("fs");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });

export const generateQuestions = async (req, res) => {
  try {
    const { userInput, country } = req.body;

    if (!userInput || !country) {
      return res.status(400).json({ error: "User input and country are required." });
    }

    const prompt = `Generate 3-4 key questions for a legal document in ${country} based on: ${userInput}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const questions = response.text().split("\n").filter(Boolean);

    res.status(200).json({ questions });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({ error: "Failed to generate questions." });
  }
};

export const createDocument = async (req, res) => {
  try {
    const { answers, userInput, country } = req.body;

    if (!answers || !userInput || !country) {
      return res.status(400).json({ error: "Answers, user input, and country are required." });
    }

    const prompt = `Generate a legal document for ${country}:
                    User Input: ${userInput}
                    Answers: ${JSON.stringify(answers)}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const legalText = response.text().trim();

    const docxBuffer = await generateDocx(legalText);
    const pdfBuffer = await generatePDF(legalText);

    res.status(200).json({
      docx: Buffer.from(docxBuffer).toString("base64"),
      pdf: Buffer.from(pdfBuffer).toString("base64"),
    });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document." });
  }
};

const generateDocx = async (text) => {
  const doc = new Document({
    sections: [{ children: createFormattedParagraphs(text) }],
  });
  return await Packer.toBuffer(doc);
};

const generatePDF = async (text) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    
    // Sanitize text to handle special characters
    const sanitizedText = sanitizeTextForPDF(text);
    
    let y = 750;
    let currentPage = page;
    
    sanitizedText.split("\n").forEach((line) => {
      if (y < 50) {
        currentPage = pdfDoc.addPage([600, 800]);
        y = 750;
      }
      
      try {
        currentPage.drawText(line, { 
          x: 50, 
          y, 
          size: fontSize, 
          font, 
          color: rgb(0, 0, 0) 
        });
      } catch (err) {
        // Log the error but continue processing
        console.warn(`Warning: Could not render some characters. Error: ${err.message}`);
        // Try rendering with problematic characters replaced
        try {
          const fallbackLine = replaceSpecialChars(line);
          currentPage.drawText(fallbackLine, { 
            x: 50, 
            y, 
            size: fontSize, 
            font, 
            color: rgb(0, 0, 0) 
          });
        } catch (fallbackErr) {
          console.error(`Failed to render text even after sanitization: ${fallbackErr.message}`);
        }
      }
      
      y -= 20;
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
};

// Function to sanitize text for PDF rendering
const sanitizeTextForPDF = (text) => {
  if (!text) return "";
  
  // Replace common problematic characters
  return text
    .replace(/₹/g, "Rs.") // Replace Rupee symbol with "Rs."
    .replace(/[^\x00-\x7F]/g, char => {
      // For other non-ASCII characters, try to find a replacement or remove
      const replacements = {
        '©': '(c)',
        '®': '(r)',
        '™': '(tm)',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        // Add more replacements as needed
      };
      
      return replacements[char] || char;
    });
};

// More aggressive replacement for fallback rendering
const replaceSpecialChars = (text) => {
  return text.replace(/[^\x00-\x7F]/g, '?');
};

const createFormattedParagraphs = (text) => {
  return text.split("\n").map((line) => {
    return new Paragraph({
      children: [new TextRun(line)],
      spacing: { after: 100 },
      alignment: AlignmentType.JUSTIFIED,
    });
  });
};
