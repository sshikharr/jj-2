# Juristo API Service Documentation

## Endpoints

### 1. `/connection` (GET)
#### Description:
Fetches the details of the user associated with the provided API key, including their name and subscription type.

#### Request:
- **Method**: GET
- **URL**: `/connection`
- **Headers**:
  - `x-api-key`: The API key of the user (optional if provided as a query parameter).
- **Query Parameters**:
  - `apiKey`: The API key of the user (optional if provided in headers).

#### Sample request
- curl -X GET http://localhost:5001/connection \
  -H "x-api-key: 53e8477c8c3dbc7b0fa05190908120bf123bbae3edb8aa21275e35a86eefac5c"


#### Response:
- **200 OK**:
  ```json
  {
    "name": "John Doe",
    "userId": "UID12345678",
    "subscription": "premium"
  }




----------------------------------------------------------------------------
## 2. `/chat` (POST)

### Description
Facilitates chat interactions with the Juristo Legal AI Assistant. This endpoint processes user messages and responds based on the context provided. The assistant specializes in Indian and international law, offering localized and language-specific assistance.

---

### Request

- **Method**: POST  
- **URL**: `/chat`  

#### Query Parameters:
- `apiKey` (string, required): The API key of the user for authentication. Must be passed as a query parameter (`?apiKey=<API_KEY>`).

#### Headers:
- `Content-Type`: `application/json`

#### Body (JSON):
- `message` (string, required): The user's query or input to the assistant.  
- `country` (string, required): The user's country for localization (e.g., `India`).  
- `language` (string, required): The preferred language for responses (e.g., `en`, `hi`).  
- `context` (array, optional): An array of previous messages for the conversation's context. Each message should follow the format:
  ```json
  {
    "role": "user|assistant|system",
    "content": "Message text"
  }
- `chatId` (string, optional): The ID of an existing chat to continue the conversation. If provided, the system will append the new message to the existing chat history.


#### Sample request for a new chat
```bash
curl -X POST "http://localhost:5001/chat?apiKey=53e8477c8c3dbc7b0fa05190908120bf123bbae3edb8aa21275e35a86eefac5c" \
-H "Content-Type: application/json" \
-d '{
      "message": "What are the property dispute laws in India?",
      "country": "India",
      "language": "en"
    }'
```

#### Sample request for continuing a conversation
```bash
curl -X POST "http://localhost:5001/chat?apiKey=53e8477c8c3dbc7b0fa05190908120bf123bbae3edb8aa21275e35a86eefac5c" \
-H "Content-Type: application/json" \
-d '{
      "message": "What are the possible remedies available?",
      "country": "India",
      "language": "en",
      "chatId": "CID1674121234567"
    }'
```

#### Response:
- **200 OK**:
  ```json
  {
  "title": "Chat on 2025-01-19",
  "response": "Property disputes in India are governed by the Transfer of Property Act and various local state laws...",
  "chatId": "CID1674121234567"
  }
  ```

- **404 Not Found** (When an invalid chatId is provided):
  ```json
  {
    "message": "Chat not found with the provided chatId."
  }
  ```

----------------------------------------------------------------------

### 3. `/document` (POST)
#### Description:
Allows users to upload a document (PDF or image) for analysis. The document's content is extracted and stored for later use. This endpoint returns the extracted content along with a title and context for further interaction.

#### Request:
- **Method**: POST
- **URL**: `/document`
- **Headers**:
  - `x-api-key`: The API key of the user (required for authentication).
- **Body** (multipart/form-data):
  - `file` (file, required): The document to be analyzed (PDF or image).
  
#### Sample request
```bash
curl -X POST http://localhost:5001/document \
  -H "x-api-key: 53e8477c8c3dbc7b0fa05190908120bf123bbae3edb8aa21275e35a86eefac5c" \
  -F "file=@/path/to/document.pdf"
```

#### Sample response
{
    "documentId": "unique_document_id", (Please store this document Id, very important)
    "title": "Document Title",
    "content": "Extracted document content...",
}

-------------------------------------------------------

### 4. `/query` (POST)
#### Description:
Allows users to ask questions about a previously uploaded document. The document's content is retrieved from the cache, and the assistant responds to the user's query based on the document context.

#### Request:
- **Method**: POST
- **URL**: `/query`
- **Headers**:
  - `x-api-key`: The API key of the user (required for authentication).
- **Body** (JSON):
  - `documentId` (string, required): The ID of the document for which questions are being asked.
  - `question` (string, required): The question regarding the document's content.

#### Sample request
```bash
curl -X POST http://localhost:5001/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: 53e8477c8c3dbc7b0fa05190908120bf123bbae3edb8aa21275e35a86eefac5c" \
  -d '{
        "documentId": "unique_document_id", 
        "question": "What is the legal process for property dispute resolution in India?"
      }'
```
#### Response

```json
{
    "data": "The document provided is an agreement between a CONSULTANT and a COMMISSION for the provision of services. It outlines various terms and conditions regarding payment, deliverables, termination, invoicing procedures, milestones, prevailing wage rates, and the term of the agreement. The agreement specifies requirements for approval of work, payment procedures, cost estimates, submission of itemized invoices, format of progress reports, and guidelines for early termination of the agreement."
}
```
--------------------------------------------------------------------

# API Documentation

## 5. `/drafting/questions` (POST)
### Description:
Generates a set of key legal questions based on the user input and the relevant country. This helps in drafting legal documents by first identifying the crucial questions.

### Request:
- **Method**: POST
- **URL**: `/drafting/questions`
- **Headers**:
  - `x-api-key`: The API key of the user (required for authentication).
- **Body** (JSON):
  - `userInput` (string, required): The user’s description or context for the legal document.
  - `country` (string, required): The country for which the questions are being generated, as legal practices differ by jurisdiction.

### Sample request
```bash
curl -X POST http://localhost:5001/drafting/questions \
  -H "Content-Type: application/json" \
  -H "x-api-key: 53e8477c8c3dbc7b0fa05190908120bf123bbae3edb8aa21275e35a86eefac5c" \
  -d '{
        "userInput": "I want a document to finalise renting a flat to two people .",
        "country": "India"
      }'
```
### Response

{
    "questions": [
        "1. Have both the parties agreed on the rental amount for the flat, and is it clearly mentioned in the document? ",
        "2. Does the agreement specify the duration of the lease and conditions for renewal or termination? ",
        "3. Are the responsibilities of both the tenant and the landlord towards maintenance and repair of the property clearly defined in the document?",
        "4. Does the document outline the conditions under which the security deposit will be refunded to the tenants?"
    ]
}


## 6. `/drafting/document` (POST)

### Description:
Generates a legal document based on the answers to the questions generated in the `/drafting/questions` endpoint and the user input. The result is provided in both PDF and DOCX formats as base64-encoded strings.

### Request:
- **Method**: POST
- **URL**: `/drafting/document`
- **Headers**:
  - `x-api-key`: The API key of the user (required for authentication).
  
- **Body** (JSON):
  - `answers` (array of strings, required): The answers to the questions generated in the `/drafting/questions` step.
  - `userInput` (string, required): The user’s description or context for the legal document.
  - `country` (string, required): The country for which the document is being generated.

### Sample request
```bash
curl -X POST http://localhost:5001/drafting/document \
  -H "Content-Type: application/json" \
  -H "x-api-key: 53e8477c8c3dbc7b0fa05190908120bf123bbae3edb8aa21275e35a86eefac5c" \
  -d '{
        "answers": [
          "yes.",
          "Evidence required includes property deeds, witness testimonies, and any previous judgments related to the property.",
          "The process can take anywhere from 6 months to 2 years depending on the complexity of the case.",
          "Common legal terms include injunction, property title, and encumbrances."
        ],
        "userInput": "Draft a document regarding property dispute resolution",
        "country": "India"
      }'
```

### Response

```json
{
    "docx": "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",
    "pdf": "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"
}
```

### NOTE, you can extract the files using :-

```javascript
    const fs = require('fs')

    const encodedDocx = response.data.docx;
    const decodedDocx = Buffer.from(encodedDocx, "base64");
    fs.writeFileSync("decoded_legal.docx", decodedDocx);
```


-----------------------------------------------------------------------------------------------------------