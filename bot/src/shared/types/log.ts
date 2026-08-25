export interface LogMessage {
  // 1. Timestamp (формат: "2026-06-19 00:40:01")
  timestamp: string;
  
  // 2. User Full Name (об'єднане: "First - Last - Username")
  user_full_name: string;
  
  // 3. User ID
  user_id?: number;
  
  // 4. Action Type (command, message, callback, inline_query, edited_message)
  action_type: string;
  
  // 5. Action Content Text (команда, текст, caption, callback data)
  action_content_text: string;
  
  // 6. Action Content File (JSON з інфо про файл або "...")
  action_content_file: string;
  
  // 7. Environment
  environment: string;
  
  // 8. Language Code
  language_code: string;
  
  // 9. Is Premium
  is_premium: string;
  
  // 10. Chat ID
  chat_id?: number;
  
  // 11. Chat Type
  chat_type: string;
  
  // 12. Chat Title
  chat_title: string;
  
  // 13. Chat Topic ID (thread_id)
  chat_topic_id: string;
  
  // 14. Status
  status: 'success' | 'error';
  
  // 15. Duration (ms)
  duration_ms: number;
  
  // 16. Level
  level: 'info' | 'error' | 'warn';
  
  // 17. Raw JSON
  raw_json: string;
}