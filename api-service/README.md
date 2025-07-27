# To upload the document

```java
curl -X POST "http://localhost:5001/document?apiKey=YOUR_API_KEY" \
  -F "file=@path/to/document.pdf"
```

## Response example :

```json
{
  "data": {
    "title": "Document Title",
    "content": "Extracted content from the document...",
    "context": ["context", "extracted", "from", "document"],
    "documentId": "unique-document-id"
  }
}
```

# Ask question from the document

```java
curl -X POST "http://localhost:5001/query?apiKey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "unique-document-id",
    "question": "What is the main topic of the document?"
  }'
```

## Response example
```json
{
  "data": "The main topic of the document is XYZ..."
}
```

# Start a chat

```java
curl -X POST "http://localhost:5001/chat?apiKey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the legal process for property disputes?",
    "newChat": true,
    "country": "India",
    "language": "English",
    "userId": "user-id-123"
  }'
```

## Response example

```json
{
  "title": "Legal Process for Property Disputes",
  "response": "The legal process for property disputes in India involves the following steps...",
  "chatId": "CID123456789"
}
```

# Continue existing chat

```
curl -X POST "http://localhost:5001/chat?apiKey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you elaborate on the steps involved?",
    "chatId": "CID123456789",
    "userId": "user-id-123",
    "country": "India",
    "language": "English"
  }'
```

## Response example

```json
{
  "title": "Legal Process for Property Disputes",
  "response": "To elaborate, the steps include filing a case in the civil court, collecting evidence, etc.",
  "chatId": "CID123456789"
}
```