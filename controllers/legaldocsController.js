import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Legaldocs } from "../models/Legaldocs.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";

export const generateQuestions = async (req, res) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const { userInput, country } = req.body;

    // Ensure that userInput and country are provided
    if (!userInput || !country) {
      return res
        .status(400)
        .json({ error: "User input and country are required." });
    }

    // Call Gemini API for question generation
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });
    const result = await model.generateContent({
      contents: [
        {
          role: "user", // Gemini does not support "system"; use "user"
          parts: [
            {
              text: "You are a legal assistant generating tailored questions to create detailed legal documents. Focus on providing only the 3-4 most critical and relevant questions needed to gather essential details.",
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              text: `Generate only 3-4 focused questions to gather key details for a legal document in ${country} based on the following input: ${userInput}`,
            },
          ],
        },
      ],
    });

    const response = await result.response;
    const questions = response.text().trim().split("\n").filter(Boolean);
    console.log(questions);
    return res.status(200).json({ questions });
  } catch (error) {
    console.error("Error generating questions:", error);
    return res.status(500).json({ error: "Failed to generate questions." });
  }
};

export const createDocument = async (req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://juristo-sigma.vercel.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // Extract required fields from the request body
    const { userId, answers, userInput, country } = req.body;

    // Ensure that all required fields are provided
    if (!userId || !answers || !userInput || !country) {
      console.log("Missing required fields:", {
        userId,
        answers,
        userInput,
        country,
      });
      return res.status(400).json({
        error: "User ID, answers, user input, and country are required.",
      });
    }
    // Call Gemini API to generate the legal document
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });
    const result = await model.generateContent({
      contents: [
        {
          role: "user", // Gemini does not support "system"; use "user"
          parts: [
            {
              text: `You are a professional legal assistant with expertise in drafting various legal documents. Your task is to create thorough, clear, and sensible legal documents for any type of agreement or legal form (such as contracts, policies, terms of service, non-disclosure agreements, etc.). The document must be comprehensive, properly structured, and legally sound, tailored to the laws and requirements of the user's country that is ${country}. Each document should be at least 3-5 pages long, with logically divided sections, and cover all essential legal provisions.`,
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              text: `Based on the following user input and answers, generate a detailed legal document tailored for ${country}: 
                  User Input: ${userInput}
                  Answers: ${JSON.stringify(answers)}`,
            },
          ],
        },
      ],
    });


    const response = await result.response;
    const legalText = response.text().trim();

    // Generate DOCX and PDF buffers
    const docxBuffer = await generateDocx(legalText);
    const pdfBuffer = await generatePDF(legalText);

    // Convert DOCX to HTML for preview
    const previewResult = await mammoth.convertToHtml({ buffer: docxBuffer });

    // Save the generated document to the database
    const document = new Legaldocs({ userId, userInput, answers, country });
    await document.save();

    // Return generated document preview and file buffers
    res.status(200).json({
      preview: previewResult.value,
      docx: Buffer.from(docxBuffer).toString("base64"),
      pdf: Buffer.from(pdfBuffer).toString("base64"),
    });
  } catch (error) {
    console.error("Error creating document:", error);
    return res.status(500).json({ error: "Failed to create document." });
  }
};

export const getAllDocumentsByUserId = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }
    const documents = await Legaldocs.find({ userId }).populate(
      "userId",
      "name email"
    );
    return res.status(200).json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return res.status(500).json({ error: "Failed to fetch documents." });
  }
};

// Helper function to generate PDF
export const generatePDF = async (text) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const textLines = text.split("\n");
  let y = 750;
  textLines.forEach((line) => {
    if (y < 50) {
      page = pdfDoc.addPage([600, 800]);
      y = 750;
    }
    page.drawText(line, {
      x: 50,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

// Helper function to generate DOCX
export const generateDocx = async (text) => {
  const doc = new Document({
    sections: [
      {
        children: createFormattedParagraphs(text),
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return buffer;
};

// Helper function to format paragraphs for DOCX
const createFormattedParagraphs = (text) => {
  const paragraphs = [];
  const lines = text.split("\n");
  lines.forEach((line) => {
    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: " ", spacing: { after: 200 } }));
    } else if (line.startsWith("**") && line.endsWith("**")) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/\*\*/g, ""),
          bold: true,
          spacing: { after: 200 },
          alignment: AlignmentType.LEFT,
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 100 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    }
  });
  return paragraphs;
};
