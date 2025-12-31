// Tool definitions for AI chatbot function calling

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
      additionalProperties?: boolean;
    };
  };
}

export const CHAT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "save_topic",
      description: "Lưu ý tưởng topic vào Topic Bank để sử dụng sau. Gọi khi user muốn lưu/save topic đã gợi ý.",
      parameters: {
        type: "object",
        properties: {
          topic: { 
            type: "string", 
            description: "Tiêu đề topic cần lưu" 
          },
          category: { 
            type: "string", 
            enum: ["educational", "engagement", "commercial", "entertainment", "awareness", "thought-leadership"],
            description: "Phân loại topic" 
          },
          pillar: { 
            type: "string", 
            description: "Content pillar phù hợp (nếu có)" 
          },
          reasoning: { 
            type: "string", 
            description: "Lý do topic này hay/phù hợp" 
          },
          suggested_format: { 
            type: "string", 
            enum: ["script", "carousel", "multichannel"],
            description: "Format content đề xuất" 
          }
        },
        required: ["topic", "category", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_script",
      description: "Tạo video script TikTok/YouTube Shorts từ topic. Gọi khi user muốn tạo script cho topic.",
      parameters: {
        type: "object",
        properties: {
          topic: { 
            type: "string", 
            description: "Topic/chủ đề cho video script" 
          },
          video_type: { 
            type: "string", 
            enum: ["expert_share", "tutorial_howto", "listicle", "story_pov", "before_after", "reaction", "challenge"],
            description: "Loại video" 
          },
          duration: { 
            type: "number", 
            description: "Thời lượng video (giây, 15-180)" 
          },
          character_type: { 
            type: "string", 
            enum: ["single", "duo", "narrator", "interview"],
            description: "Loại nhân vật trong video" 
          }
        },
        required: ["topic", "video_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_carousel",
      description: "Tạo carousel image prompts cho Facebook/TikTok slides. Gọi khi user muốn tạo carousel.",
      parameters: {
        type: "object",
        properties: {
          topic: { 
            type: "string", 
            description: "Topic/chủ đề cho carousel" 
          },
          platform: { 
            type: "string", 
            enum: ["facebook", "tiktok", "instagram", "linkedin"],
            description: "Nền tảng đăng carousel" 
          },
          slide_count: { 
            type: "number", 
            description: "Số lượng slides (3-10)" 
          }
        },
        required: ["topic", "platform"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_multichannel",
      description: "Tạo nội dung cho nhiều kênh social media cùng lúc. Gọi khi user muốn tạo multi-channel content.",
      parameters: {
        type: "object",
        properties: {
          topic: { 
            type: "string", 
            description: "Topic/chủ đề cho content" 
          },
          channels: { 
            type: "array", 
            items: { 
              type: "string", 
              enum: ["facebook", "instagram", "linkedin", "tiktok", "x", "threads", "website"] 
            },
            description: "Các kênh cần tạo content" 
          },
          content_goal: { 
            type: "string", 
            enum: ["engagement", "awareness", "conversion", "education"],
            description: "Mục tiêu content" 
          }
        },
        required: ["topic", "channels"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_topics",
      description: "Tìm kiếm topics đã lưu trong Topic Bank theo từ khóa. Gọi khi user muốn tìm/search topics cũ.",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "Từ khóa tìm kiếm" 
          },
          category: { 
            type: "string",
            description: "Lọc theo category" 
          },
          min_score: { 
            type: "number", 
            description: "Điểm performance tối thiểu (0-100)" 
          },
          limit: { 
            type: "number", 
            description: "Số lượng kết quả tối đa" 
          }
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
];

export interface ToolCallResult {
  success: boolean;
  tool_name: string;
  result: any;
  error?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}
