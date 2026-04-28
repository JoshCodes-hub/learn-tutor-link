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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          note: string | null
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          school_id: string
          status: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bookmarked_questions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarked_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcements: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_announcements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_shared_quizzes: {
        Row: {
          community_id: string
          id: string
          message: string | null
          quiz_id: string
          shared_at: string
        }
        Insert: {
          community_id: string
          id?: string
          message?: string | null
          quiz_id: string
          shared_at?: string
        }
        Update: {
          community_id?: string
          id?: string
          message?: string | null
          quiz_id?: string
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_shared_quizzes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_shared_quizzes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          preferred_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          preferred_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          preferred_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_survival_kits: {
        Row: {
          contents: Json
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          token_cost: number
          tutor_id: string
          updated_at: string
        }
        Insert: {
          contents?: Json
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          token_cost?: number
          tutor_id: string
          updated_at?: string
        }
        Update: {
          contents?: Json
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          token_cost?: number
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          path_type: Database["public"]["Enums"]["academic_path"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          path_type?: Database["public"]["Enums"]["academic_path"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          path_type?: Database["public"]["Enums"]["academic_path"]
          updated_at?: string
        }
        Relationships: []
      }
      discussion_replies: {
        Row: {
          content: string
          created_at: string
          discussion_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          discussion_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_goals: {
        Row: {
          created_at: string
          exam_label: string | null
          id: string
          is_active: boolean
          target_date: string
          target_score: number
          updated_at: string
          user_id: string
          weekly_quiz_target: number
        }
        Insert: {
          created_at?: string
          exam_label?: string | null
          id?: string
          is_active?: boolean
          target_date: string
          target_score?: number
          updated_at?: string
          user_id: string
          weekly_quiz_target?: number
        }
        Update: {
          created_at?: string
          exam_label?: string | null
          id?: string
          is_active?: boolean
          target_date?: string
          target_score?: number
          updated_at?: string
          user_id?: string
          weekly_quiz_target?: number
        }
        Relationships: []
      }
      favorite_tutors: {
        Row: {
          created_at: string
          id: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string
          fee_id: string
          id: string
          method: string | null
          paid_on: string
          receipt_no: string | null
          recorded_by: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          fee_id: string
          id?: string
          method?: string | null
          paid_on?: string
          receipt_no?: string | null
          recorded_by?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          fee_id?: string
          id?: string
          method?: string | null
          paid_on?: string
          receipt_no?: string | null
          recorded_by?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          class_id: string | null
          created_at: string
          id: string
          is_active: boolean
          school_id: string
          term_id: string | null
          title: string
        }
        Insert: {
          amount?: number
          class_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id: string
          term_id?: string | null
          title: string
        }
        Update: {
          amount?: number
          class_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id?: string
          term_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "school_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          academic_path: Database["public"]["Enums"]["academic_path"] | null
          back: string
          created_at: string
          front: string
          id: string
          is_public: boolean
          subject: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          back: string
          created_at?: string
          front: string
          id?: string
          is_public?: boolean
          subject?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          back?: string
          created_at?: string
          front?: string
          id?: string
          is_public?: boolean
          subject?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_metadata: Json
          academic_path: Database["public"]["Enums"]["academic_path"] | null
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          profile_image_url: string | null
          referral_code: string | null
          referred_by: string | null
          tutor_code: string | null
          tutor_match_prefs: Json
          tutor_specialization:
            | Database["public"]["Enums"]["academic_path"]
            | null
          updated_at: string
        }
        Insert: {
          academic_metadata?: Json
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          profile_image_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          tutor_code?: string | null
          tutor_match_prefs?: Json
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
          updated_at?: string
        }
        Update: {
          academic_metadata?: Json
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          profile_image_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          tutor_code?: string | null
          tutor_match_prefs?: Json
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          question_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tutor_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          question_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          question_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_option: string
          course_id: string
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          image_url: string | null
          is_approved: boolean
          is_past_question: boolean
          is_premium: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          topic_id: string
          tutor_id: string | null
          year: number | null
        }
        Insert: {
          correct_option: string
          course_id: string
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_past_question?: boolean
          is_premium?: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          topic_id: string
          tutor_id?: string | null
          year?: number | null
        }
        Update: {
          correct_option?: string
          course_id?: string
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_past_question?: boolean
          is_premium?: boolean
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          topic_id?: string
          tutor_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          correct_answers: number
          id: string
          mode: string
          quiz_id: string
          score: number
          started_at: string
          time_spent_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number
          id?: string
          mode: string
          quiz_id: string
          score?: number
          started_at?: string
          time_spent_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number
          id?: string
          mode?: string
          quiz_id?: string
          score?: number
          started_at?: string
          time_spent_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          order_index: number
          question_id: string
          quiz_id: string
        }
        Insert: {
          id?: string
          order_index?: number
          question_id: string
          quiz_id: string
        }
        Update: {
          id?: string
          order_index?: number
          question_id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_ratings: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_ratings_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_premium: boolean
          is_simulation: boolean
          question_count: number
          school_class_id: string | null
          school_id: string | null
          title: string
          token_cost: number
          tutor_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_premium?: boolean
          is_simulation?: boolean
          question_count?: number
          school_class_id?: string | null
          school_id?: string | null
          title: string
          token_cost?: number
          tutor_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_premium?: boolean
          is_simulation?: boolean
          question_count?: number
          school_class_id?: string | null
          school_id?: string | null
          title?: string
          token_cost?: number
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_school_class_id_fkey"
            columns: ["school_class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referee_id: string
          referee_tokens: number
          referrer_id: string
          referrer_tokens: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id: string
          referee_tokens?: number
          referrer_id: string
          referrer_tokens?: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string
          referee_tokens?: number
          referrer_id?: string
          referrer_tokens?: number
          status?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          ca1: number | null
          ca2: number | null
          class_id: string
          created_at: string
          exam: number | null
          grade: string | null
          id: string
          position: number | null
          remark: string | null
          school_id: string
          student_id: string
          subject_id: string
          teacher_id: string | null
          term_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          ca1?: number | null
          ca2?: number | null
          class_id: string
          created_at?: string
          exam?: number | null
          grade?: string | null
          id?: string
          position?: number | null
          remark?: string | null
          school_id: string
          student_id: string
          subject_id: string
          teacher_id?: string | null
          term_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          ca1?: number | null
          ca2?: number | null
          class_id?: string
          created_at?: string
          exam?: number | null
          grade?: string | null
          id?: string
          position?: number | null
          remark?: string | null
          school_id?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
          term_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "school_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          audience: string
          body: string
          class_id: string | null
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          title: string
        }
        Insert: {
          audience?: string
          body: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          arm: string
          class_teacher_id: string | null
          created_at: string
          id: string
          level: string
          school_id: string
        }
        Insert: {
          arm?: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          level: string
          school_id: string
        }
        Update: {
          arm?: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          level?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          created_at: string
          id: string
          member_role: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_role: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_role?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_students: {
        Row: {
          admission_date: string
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          parent_email: string | null
          parent_phone: string | null
          parent_user_id: string | null
          school_id: string
          student_code: string
          user_id: string | null
        }
        Insert: {
          admission_date?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          parent_email?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          school_id: string
          student_code: string
          user_id?: string | null
        }
        Update: {
          admission_date?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          parent_email?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          school_id?: string
          student_code?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_terms: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          is_current: boolean
          school_id: string
          session: string
          starts_on: string | null
          term: number
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          school_id: string
          session: string
          starts_on?: string | null
          term: number
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          school_id?: string
          session?: string
          starts_on?: string | null
          term?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          approval_number: string | null
          brand_color: string | null
          created_at: string
          email: string | null
          id: string
          lga: string | null
          logo_url: string | null
          motto: string | null
          name: string
          owner_id: string
          phone: string | null
          principal_name: string | null
          rejection_reason: string | null
          report_footer: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          approval_number?: string | null
          brand_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lga?: string | null
          logo_url?: string | null
          motto?: string | null
          name: string
          owner_id: string
          phone?: string | null
          principal_name?: string | null
          rejection_reason?: string | null
          report_footer?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          approval_number?: string | null
          brand_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lga?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          principal_name?: string | null
          rejection_reason?: string | null
          report_footer?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_quiz_purchases: {
        Row: {
          id: string
          purchased_at: string
          quiz_id: string
          student_id: string
          tokens_spent: number
        }
        Insert: {
          id?: string
          purchased_at?: string
          quiz_id: string
          student_id: string
          tokens_spent: number
        }
        Update: {
          id?: string
          purchased_at?: string
          quiz_id?: string
          student_id?: string
          tokens_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_quiz_purchases_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_material_artifacts: {
        Row: {
          content: Json
          generated_at: string
          id: string
          kind: string
          material_id: string
        }
        Insert: {
          content: Json
          generated_at?: string
          id?: string
          kind: string
          material_id: string
        }
        Update: {
          content?: Json
          generated_at?: string
          id?: string
          kind?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_material_artifacts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "study_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          owner_id: string
          tags: string[]
          title: string
          topic_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number
          file_type: string
          file_url: string
          id?: string
          owner_id: string
          tags?: string[]
          title: string
          topic_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          owner_id?: string
          tags?: string[]
          title?: string
          topic_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          plan_data: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_streaks: {
        Row: {
          created_at: string
          current_streak: number
          daily_goal_quizzes: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          daily_goal_quizzes?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          daily_goal_quizzes?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          category: Database["public"]["Enums"]["academic_path"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: string | null
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["academic_path"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["academic_path"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
        }
        Relationships: []
      }
      team_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          reward_claimed: boolean
          team_id: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          reward_claimed?: boolean
          team_id: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          reward_claimed?: boolean
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "team_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_challenge_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_challenges: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string
          goal_type: string
          goal_value: number
          id: string
          is_active: boolean
          reward_tokens: number
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at: string
          goal_type: string
          goal_value: number
          id?: string
          is_active?: boolean
          reward_tokens?: number
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string
          goal_type?: string
          goal_value?: number
          id?: string
          is_active?: boolean
          reward_tokens?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          max_members: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          max_members?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          max_members?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      theory_attempts: {
        Row: {
          ai_feedback: Json | null
          ai_score: number | null
          answer_text: string
          created_at: string
          id: string
          question_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          ai_score?: number | null
          answer_text?: string
          created_at?: string
          id?: string
          question_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: Json | null
          ai_score?: number | null
          answer_text?: string
          created_at?: string
          id?: string
          question_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      theory_questions: {
        Row: {
          course_id: string
          created_at: string
          difficulty: string
          id: string
          is_approved: boolean
          key_points: Json
          marks: number
          model_answer: string | null
          question_text: string
          source: string | null
          topic_id: string | null
          tutor_id: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          difficulty?: string
          id?: string
          is_approved?: boolean
          key_points?: Json
          marks?: number
          model_answer?: string | null
          question_text: string
          source?: string | null
          topic_id?: string | null
          tutor_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          difficulty?: string
          id?: string
          is_approved?: boolean
          key_points?: Json
          marks?: number
          model_answer?: string | null
          question_text?: string
          source?: string | null
          topic_id?: string | null
          tutor_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          period_no: number
          school_id: string
          start_time: string | null
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          period_no: number
          school_id: string
          start_time?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          period_no?: number
          school_id?: string
          start_time?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      token_purchase_requests: {
        Row: {
          admin_notes: string | null
          amount_paid: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tokens_requested: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_paid: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tokens_requested: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tokens_requested?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "token_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      token_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_applications: {
        Row: {
          admin_notes: string | null
          bio: string | null
          courses_to_teach: string
          created_at: string
          email: string
          experience: string
          full_name: string
          id: string
          profile_image_url: string | null
          qualifications: string
          reviewed_at: string | null
          reviewed_by: string | null
          specialization: Database["public"]["Enums"]["academic_path"] | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          bio?: string | null
          courses_to_teach: string
          created_at?: string
          email: string
          experience: string
          full_name: string
          id?: string
          profile_image_url?: string | null
          qualifications: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization?: Database["public"]["Enums"]["academic_path"] | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          bio?: string | null
          courses_to_teach?: string
          created_at?: string
          email?: string
          experience?: string
          full_name?: string
          id?: string
          profile_image_url?: string | null
          qualifications?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization?: Database["public"]["Enums"]["academic_path"] | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_communities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string
          is_active: boolean
          name: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code: string
          is_active?: boolean
          name: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          name?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_earnings: {
        Row: {
          created_at: string
          id: string
          platform_share: number
          quiz_id: string | null
          student_id: string
          tokens_paid: number
          tutor_id: string
          tutor_share: number
        }
        Insert: {
          created_at?: string
          id?: string
          platform_share: number
          quiz_id?: string | null
          student_id: string
          tokens_paid: number
          tutor_id: string
          tutor_share: number
        }
        Update: {
          created_at?: string
          id?: string
          platform_share?: number
          quiz_id?: string | null
          student_id?: string
          tokens_paid?: number
          tutor_id?: string
          tutor_share?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutor_earnings_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_performance_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          readiness_score: number
          snapshot_date: string
          strong_topics: Json
          user_id: string
          weak_topics: Json
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          readiness_score?: number
          snapshot_date?: string
          strong_topics?: Json
          user_id: string
          weak_topics?: Json
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          readiness_score?: number
          snapshot_date?: string
          strong_topics?: Json
          user_id?: string
          weak_topics?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_community_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_team_code: { Args: never; Returns: string }
      generate_tutor_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_school_member: {
        Args: { _role?: string; _school_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      academic_path: "secondary" | "jamb" | "university"
      app_role:
        | "student"
        | "tutor"
        | "admin"
        | "school_owner"
        | "school_admin"
        | "teacher"
        | "parent"
      application_status: "pending" | "approved" | "rejected"
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
      academic_path: ["secondary", "jamb", "university"],
      app_role: [
        "student",
        "tutor",
        "admin",
        "school_owner",
        "school_admin",
        "teacher",
        "parent",
      ],
      application_status: ["pending", "approved", "rejected"],
    },
  },
} as const
