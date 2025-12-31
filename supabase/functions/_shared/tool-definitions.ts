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
  // ============ WEB SEARCH TOOL ============
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Tìm kiếm real-time từ internet: trending topics, tin tức ngành, competitor analysis. Gọi khi user hỏi về trends mới nhất, tin tức, đối thủ, hoặc cần thông tin cập nhật từ web.",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "Từ khóa tìm kiếm" 
          },
          search_type: { 
            type: "string", 
            enum: ["trending", "news", "competitor", "general"],
            description: "Loại tìm kiếm: trending (xu hướng viral), news (tin tức ngành), competitor (phân tích đối thủ), general (tìm chung)" 
          },
          industry: { 
            type: "string", 
            description: "Ngành nghề để lọc kết quả (optional)" 
          },
          recency: { 
            type: "string", 
            enum: ["day", "week", "month"],
            description: "Độ mới: day (24h qua), week (7 ngày), month (30 ngày)" 
          },
          max_results: { 
            type: "number", 
            description: "Số kết quả tối đa (3-10, mặc định 5)" 
          }
        },
        required: ["query", "search_type"],
        additionalProperties: false,
      },
    },
  },
  // ============ TOPIC MANAGEMENT TOOLS ============
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
  // ============ PLANNING TOOLS ============
  {
    type: "function",
    function: {
      name: "start_planning_session",
      description: "Bắt đầu một phiên lập kế hoạch content mới. Gọi khi user muốn lên kế hoạch tuần/tháng/campaign.",
      parameters: {
        type: "object",
        properties: {
          session_type: { 
            type: "string", 
            enum: ["weekly", "monthly", "campaign", "event"],
            description: "Loại kế hoạch" 
          },
          goal: { 
            type: "string", 
            description: "Mục tiêu của kế hoạch (VD: Black Friday Sale, Brand Awareness)" 
          },
          timeframe_start: { 
            type: "string", 
            description: "Ngày bắt đầu (YYYY-MM-DD)" 
          },
          timeframe_end: { 
            type: "string", 
            description: "Ngày kết thúc (YYYY-MM-DD)" 
          },
          target_channels: {
            type: "array",
            items: { type: "string" },
            description: "Các kênh cần tạo content"
          }
        },
        required: ["session_type", "goal"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_plan_draft",
      description: "Tạo bản nháp kế hoạch content dựa trên session hiện tại. Gọi sau khi đã start_planning_session.",
      parameters: {
        type: "object",
        properties: {
          session_id: { 
            type: "string", 
            description: "ID của planning session" 
          },
          content_frequency: {
            type: "string",
            enum: ["daily", "every_2_days", "3_per_week", "weekly"],
            description: "Tần suất đăng content"
          },
          format_mix: {
            type: "object",
            properties: {
              scripts: { type: "number", description: "Số lượng scripts" },
              carousels: { type: "number", description: "Số lượng carousels" },
              posts: { type: "number", description: "Số lượng posts" }
            },
            description: "Phân bổ format content"
          },
          special_dates: {
            type: "array",
            items: { 
              type: "object",
              properties: {
                date: { type: "string" },
                event: { type: "string" }
              }
            },
            description: "Các ngày đặc biệt cần chú ý"
          }
        },
        required: ["session_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refine_plan",
      description: "Chỉnh sửa kế hoạch dựa trên feedback của user. Gọi khi user muốn thay đổi plan.",
      parameters: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "ID của planning session" },
          action: {
            type: "string",
            enum: ["add_topic", "remove_topic", "change_date", "change_format", "swap_order", "regenerate_day"],
            description: "Loại chỉnh sửa"
          },
          item_id: { type: "string", description: "ID của content item cần sửa (nếu có)" },
          changes: {
            type: "object",
            description: "Chi tiết thay đổi"
          },
          user_feedback: {
            type: "string",
            description: "Feedback từ user để AI hiểu ý định"
          }
        },
        required: ["session_id", "action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize_plan",
      description: "Hoàn thành và lưu kế hoạch. Tạo topics trong Topic Bank và thêm vào Calendar.",
      parameters: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "ID của planning session" },
          save_to_topic_bank: { 
            type: "boolean", 
            description: "Lưu các topics vào Topic Bank" 
          },
          create_calendar_entries: { 
            type: "boolean", 
            description: "Tạo các mục trong Content Calendar" 
          },
          auto_generate_content: {
            type: "boolean",
            description: "Tự động tạo content cho các planned items"
          }
        },
        required: ["session_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_session",
      description: "Lấy thông tin planning session đang hoạt động. Gọi để kiểm tra trạng thái hiện tại.",
      parameters: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "ID của planning session" },
          include_items: { type: "boolean", description: "Bao gồm danh sách planned items" }
        },
        required: ["session_id"],
        additionalProperties: false,
      },
    },
  },
  // ============ AGENTIC CONTROL TOOLS ============
  {
    type: "function",
    function: {
      name: "task_complete",
      description: "Gọi khi đã hoàn thành TẤT CẢ các bước cần thiết cho yêu cầu của user. AI sẽ dừng tool calling và tạo response tổng kết. QUAN TRỌNG: Chỉ gọi khi thực sự đã xong mọi việc.",
      parameters: {
        type: "object",
        properties: {
          summary: { 
            type: "string", 
            description: "Tóm tắt ngắn gọn những gì đã hoàn thành" 
          },
          outputs: {
            type: "array",
            items: { type: "string" },
            description: "Danh sách các outputs đã tạo (VD: 'Saved topic: XYZ', 'Generated script: ABC')"
          },
          next_suggestions: {
            type: "array",
            items: { type: "string" },
            description: "2-3 gợi ý hành động tiếp theo cho user (optional)"
          }
        },
        required: ["summary"],
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

// Agentic loop types
export interface AgentTurn {
  turn_number: number;
  tool_calls: ToolCall[];
  tool_results: ToolCallResult[];
  thinking?: string;
  observation_summary: string;
  duration_ms: number;
}

export interface AgentLoopResult {
  turns: AgentTurn[];
  total_turns: number;
  final_response: string;
  total_duration_ms: number;
  exit_reason: 'task_complete' | 'no_more_tools' | 'max_turns' | 'error' | 'content_only';
  task_complete_summary?: {
    summary: string;
    outputs: string[];
    next_suggestions?: string[];
  };
  accumulated_context: Record<string, any>;
}
