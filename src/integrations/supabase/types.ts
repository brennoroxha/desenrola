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
      desenrola_ads_pixels: {
        Row: {
          ads_id: string
          ativo: boolean
          atualizado_em: string
          conversion_label: string
          criado_em: string
          id: string
          nome: string | null
        }
        Insert: {
          ads_id: string
          ativo?: boolean
          atualizado_em?: string
          conversion_label: string
          criado_em?: string
          id?: string
          nome?: string | null
        }
        Update: {
          ads_id?: string
          ativo?: boolean
          atualizado_em?: string
          conversion_label?: string
          criado_em?: string
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      desenrola_api_credentials: {
        Row: {
          atualizado_em: string
          extra: Json | null
          provider: string
          public_key: string | null
          secret_key: string
        }
        Insert: {
          atualizado_em?: string
          extra?: Json | null
          provider: string
          public_key?: string | null
          secret_key: string
        }
        Update: {
          atualizado_em?: string
          extra?: Json | null
          provider?: string
          public_key?: string | null
          secret_key?: string
        }
        Relationships: []
      }
      desenrola_chat_sessions: {
        Row: {
          codigo_acordo: string
          cpf: string
          criado_em: string
          id: string
          nome: string | null
        }
        Insert: {
          codigo_acordo: string
          cpf: string
          criado_em?: string
          id?: string
          nome?: string | null
        }
        Update: {
          codigo_acordo?: string
          cpf?: string
          criado_em?: string
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      desenrola_comprovantes: {
        Row: {
          acordo: string | null
          cpf: string | null
          criado_em: string
          data_base64: string
          filename: string | null
          id: string
          ip: string | null
          mime: string | null
          nome: string | null
          size_bytes: number | null
          transaction_id: string | null
        }
        Insert: {
          acordo?: string | null
          cpf?: string | null
          criado_em?: string
          data_base64: string
          filename?: string | null
          id?: string
          ip?: string | null
          mime?: string | null
          nome?: string | null
          size_bytes?: number | null
          transaction_id?: string | null
        }
        Update: {
          acordo?: string | null
          cpf?: string | null
          criado_em?: string
          data_base64?: string
          filename?: string | null
          id?: string
          ip?: string | null
          mime?: string | null
          nome?: string | null
          size_bytes?: number | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      desenrola_cpf_consultas: {
        Row: {
          consultado_em: string
          cpf: string
          id: string
          mae: string | null
          nascimento: string | null
          nome: string | null
          raw: Json | null
          sexo: string | null
          status_api: number | null
        }
        Insert: {
          consultado_em?: string
          cpf: string
          id?: string
          mae?: string | null
          nascimento?: string | null
          nome?: string | null
          raw?: Json | null
          sexo?: string | null
          status_api?: number | null
        }
        Update: {
          consultado_em?: string
          cpf?: string
          id?: string
          mae?: string | null
          nascimento?: string | null
          nome?: string | null
          raw?: Json | null
          sexo?: string | null
          status_api?: number | null
        }
        Relationships: []
      }
      desenrola_page_events: {
        Row: {
          acordo: string | null
          cpf: string | null
          criado_em: string
          id: string
          ip: string | null
          meta: Json | null
          nome: string | null
          page: string
          referer: string | null
          session_id: string
          step: string
          user_agent: string | null
        }
        Insert: {
          acordo?: string | null
          cpf?: string | null
          criado_em?: string
          id?: string
          ip?: string | null
          meta?: Json | null
          nome?: string | null
          page: string
          referer?: string | null
          session_id: string
          step: string
          user_agent?: string | null
        }
        Update: {
          acordo?: string | null
          cpf?: string | null
          criado_em?: string
          id?: string
          ip?: string | null
          meta?: Json | null
          nome?: string | null
          page?: string
          referer?: string | null
          session_id?: string
          step?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      desenrola_pix_transactions: {
        Row: {
          acordo: string | null
          amount_cents: number
          atualizado_em: string
          cpf: string
          criado_em: string
          email: string | null
          expires_at: string | null
          gateway: string
          id: string
          nome: string | null
          notified_aprovado: boolean
          notified_gerado: boolean
          paid_at: string | null
          phone: string | null
          qr_code: string | null
          qr_code_url: string | null
          status: string
          transaction_id: string
        }
        Insert: {
          acordo?: string | null
          amount_cents: number
          atualizado_em?: string
          cpf: string
          criado_em?: string
          email?: string | null
          expires_at?: string | null
          gateway?: string
          id?: string
          nome?: string | null
          notified_aprovado?: boolean
          notified_gerado?: boolean
          paid_at?: string | null
          phone?: string | null
          qr_code?: string | null
          qr_code_url?: string | null
          status?: string
          transaction_id: string
        }
        Update: {
          acordo?: string | null
          amount_cents?: number
          atualizado_em?: string
          cpf?: string
          criado_em?: string
          email?: string | null
          expires_at?: string | null
          gateway?: string
          id?: string
          nome?: string | null
          notified_aprovado?: boolean
          notified_gerado?: boolean
          paid_at?: string | null
          phone?: string | null
          qr_code?: string | null
          qr_code_url?: string | null
          status?: string
          transaction_id?: string
        }
        Relationships: []
      }
      desenrola_settings: {
        Row: {
          atualizado_em: string
          key: string
          value: string
        }
        Insert: {
          atualizado_em?: string
          key: string
          value: string
        }
        Update: {
          atualizado_em?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      desenrola_webhook_events: {
        Row: {
          id: string
          payload: Json
          recebido_em: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          id?: string
          payload: Json
          recebido_em?: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          id?: string
          payload?: Json
          recebido_em?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
