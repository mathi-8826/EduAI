export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          recommendations: Json
          strengths: Json
          test_type: string
          user_id: string
          weaknesses: Json
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          recommendations?: Json
          strengths?: Json
          test_type: string
          user_id: string
          weaknesses?: Json
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          recommendations?: Json
          strengths?: Json
          test_type?: string
          user_id?: string
          weaknesses?: Json
        }
        Relationships: []
      }
      ai_interviews: {
        Row: {
          id: string
          user_id: string
          interview_type: "technical" | "hr"
          role: string | null
          difficulty: string
          total_questions: number
          completed_questions: number
          status: "in_progress" | "completed" | "abandoned"
          overall_feedback: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          interview_type: "technical" | "hr"
          role?: string | null
          difficulty?: string
          total_questions?: number
          completed_questions?: number
          status?: "in_progress" | "completed" | "abandoned"
          overall_feedback?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          interview_type?: "technical" | "hr"
          role?: string | null
          difficulty?: string
          total_questions?: number
          completed_questions?: number
          status?: "in_progress" | "completed" | "abandoned"
          overall_feedback?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      ai_interview_questions: {
        Row: {
          id: string
          interview_id: string
          question_number: number
          question: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          question_number: number
          question: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          question_number?: number
          question?: string
          category?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interview_questions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "ai_interviews"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_interview_answers: {
        Row: {
          id: string
          interview_id: string
          question_id: string
          user_id: string
          answer_text: string
          input_method: "text" | "voice"
          overall_feedback: string | null
          communication_feedback: string | null
          technical_feedback: string | null
          confidence_feedback: string | null
          answer_quality: "poor" | "average" | "good" | "excellent" | null
          created_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          question_id: string
          user_id: string
          answer_text: string
          input_method?: "text" | "voice"
          overall_feedback?: string | null
          communication_feedback?: string | null
          technical_feedback?: string | null
          confidence_feedback?: string | null
          answer_quality?: "poor" | "average" | "good" | "excellent" | null
          created_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          question_id?: string
          user_id?: string
          answer_text?: string
          input_method?: "text" | "voice"
          overall_feedback?: string | null
          communication_feedback?: string | null
          technical_feedback?: string | null
          confidence_feedback?: string | null
          answer_quality?: "poor" | "average" | "good" | "excellent" | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interview_answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "ai_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interview_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ai_interview_questions"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_interview_feedback: {
        Row: {
          id: string
          interview_id: string
          strengths: string[]
          improvements: string[]
          communication_feedback: string | null
          technical_feedback: string | null
          confidence_feedback: string | null
          personality_feedback: string | null
          cultural_fit_feedback: string | null
          final_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          strengths?: string[]
          improvements?: string[]
          communication_feedback?: string | null
          technical_feedback?: string | null
          confidence_feedback?: string | null
          personality_feedback?: string | null
          cultural_fit_feedback?: string | null
          final_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          strengths?: string[]
          improvements?: string[]
          communication_feedback?: string | null
          technical_feedback?: string | null
          confidence_feedback?: string | null
          personality_feedback?: string | null
          cultural_fit_feedback?: string | null
          final_summary?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interview_feedback_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "ai_interviews"
            referencedColumns: ["id"]
          }
        ]
      }
      coding_questions: {
        Row: {
          constraints: string | null
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          examples: Json
          hints: Json
          id: string
          language: string
          slug: string
          sql_schema: string | null
          starter_code: Json
          tags: string[]
          test_cases: Json
          title: string
          topic: Database["public"]["Enums"]["coding_topic"]
        }
        Insert: {
          constraints?: string | null
          created_at?: string
          description: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          examples?: Json
          hints?: Json
          id?: string
          language?: string
          slug: string
          sql_schema?: string | null
          starter_code?: Json
          tags?: string[]
          test_cases?: Json
          title: string
          topic: Database["public"]["Enums"]["coding_topic"]
        }
        Update: {
          constraints?: string | null
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          examples?: Json
          hints?: Json
          id?: string
          language?: string
          slug?: string
          sql_schema?: string | null
          starter_code?: Json
          tags?: string[]
          test_cases?: Json
          title?: string
          topic?: Database["public"]["Enums"]["coding_topic"]
        }
        Relationships: []
      }
      coding_submissions: {
        Row: {
          code: string
          execution_time_ms: number | null
          id: string
          language: string
          passed_tests: number
          question_id: string
          score: number
          status: string
          submitted_at: string
          total_tests: number
          user_id: string
        }
        Insert: {
          code: string
          execution_time_ms?: number | null
          id?: string
          language: string
          passed_tests?: number
          question_id: string
          score?: number
          status: string
          submitted_at?: string
          total_tests?: number
          user_id: string
        }
        Update: {
          code?: string
          execution_time_ms?: number | null
          id?: string
          language?: string
          passed_tests?: number
          question_id?: string
          score?: number
          status?: string
          submitted_at?: string
          total_tests?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "coding_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          college: string
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          linkedin_url: string
          updated_at: string
          year: string
        }
        Insert: {
          avatar_url?: string
          college?: string
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id: string
          linkedin_url?: string
          updated_at?: string
          year?: string
        }
        Update: {
          avatar_url?: string
          college?: string
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          linkedin_url?: string
          updated_at?: string
          year?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vqr_questions: {
        Row: {
          correct_answer: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          test_id: string
          topic: string
        }
        Insert: {
          correct_answer: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          test_id: string
          topic: string
        }
        Update: {
          correct_answer?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          test_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "vqr_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vqr_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      vqr_results: {
        Row: {
          accuracy: number
          answers_json: Json
          created_at: string
          id: string
          score: number
          test_id: string
          time_taken_seconds: number
          topic_breakdown: Json
          total: number
          user_id: string
        }
        Insert: {
          accuracy: number
          answers_json?: Json
          created_at?: string
          id?: string
          score: number
          test_id: string
          time_taken_seconds: number
          topic_breakdown?: Json
          total: number
          user_id: string
        }
        Update: {
          accuracy?: number
          answers_json?: Json
          created_at?: string
          id?: string
          score?: number
          test_id?: string
          time_taken_seconds?: number
          topic_breakdown?: Json
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vqr_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vqr_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      vqr_tests: {
        Row: {
          category: Database["public"]["Enums"]["vqr_category"]
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          duration_minutes: number
          id: string
          title: string
          topic: string
        }
        Insert: {
          category: Database["public"]["Enums"]["vqr_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          duration_minutes?: number
          id?: string
          title: string
          topic: string
        }
        Update: {
          category?: Database["public"]["Enums"]["vqr_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          duration_minutes?: number
          id?: string
          title?: string
          topic?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      coding_topic:
        | "arrays"
        | "strings"
        | "linked_list"
        | "trees"
        | "graphs"
        | "stack"
        | "queue"
        | "binary_search"
        | "sorting"
        | "dp"
        | "sql"
      difficulty: "easy" | "medium" | "hard"
      vqr_category: "quantitative" | "reasoning" | "verbal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      coding_topic: [
        "arrays",
        "strings",
        "linked_list",
        "trees",
        "graphs",
        "stack",
        "queue",
        "binary_search",
        "sorting",
        "dp",
        "sql",
      ],
      difficulty: ["easy", "medium", "hard"],
      vqr_category: ["quantitative", "reasoning", "verbal"],
    },
  },
} as const
