// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instance_ids: string[]
          max_delay: number
          media_type: string
          media_url: string | null
          message_text: string
          min_delay: number
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instance_ids?: string[]
          max_delay?: number
          media_type?: string
          media_url?: string | null
          message_text: string
          min_delay?: number
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instance_ids?: string[]
          max_delay?: number
          media_type?: string
          media_url?: string | null
          message_text?: string
          min_delay?: number
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaigns_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      configuracoes_api: {
        Row: {
          atualizado_em: string
          global_api_key: string
          id: string
          url_servidor: string
        }
        Insert: {
          atualizado_em?: string
          global_api_key: string
          id?: string
          url_servidor?: string
        }
        Update: {
          atualizado_em?: string
          global_api_key?: string
          id?: string
          url_servidor?: string
        }
        Relationships: []
      }
      dialer_queue: {
        Row: {
          created_at: string
          id: string
          lead_name: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_name?: string | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_name?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_queue: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          instance_id: string | null
          lead_name: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id?: string | null
          lead_name?: string | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id?: string | null
          lead_name?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dispatch_queue_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'dispatch_queue_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_instances'
            referencedColumns: ['id']
          },
        ]
      }
      maturador_configs: {
        Row: {
          created_at: string
          dialogue_tree: Json
          id: string
          is_active: boolean
          max_delay: number
          min_delay: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dialogue_tree?: Json
          id?: string
          is_active?: boolean
          max_delay?: number
          min_delay?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dialogue_tree?: Json
          id?: string
          is_active?: boolean
          max_delay?: number
          min_delay?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          sip_domain: string | null
          sip_extension: string | null
          sip_password: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role: string
          sip_domain?: string | null
          sip_extension?: string | null
          sip_password?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
          sip_domain?: string | null
          sip_extension?: string | null
          sip_password?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          is_maturador_active: boolean
          last_error: string | null
          name: string
          owner_id: string | null
          proxy_host: string | null
          proxy_password: string | null
          proxy_port: string | null
          proxy_url: string | null
          proxy_user: string | null
          status: string
          token: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_maturador_active?: boolean
          last_error?: string | null
          name: string
          owner_id?: string | null
          proxy_host?: string | null
          proxy_password?: string | null
          proxy_port?: string | null
          proxy_url?: string | null
          proxy_user?: string | null
          status?: string
          token: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_maturador_active?: boolean
          last_error?: string | null
          name?: string
          owner_id?: string | null
          proxy_host?: string | null
          proxy_password?: string | null
          proxy_port?: string | null
          proxy_url?: string | null
          proxy_user?: string | null
          status?: string
          token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_instances_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          contact_name: string | null
          contact_phone: string
          created_at: string
          direction: string
          id: string
          instance_id: string
          is_responded: boolean
          message_body: string
          message_id: string | null
          remote_jid: string | null
        }
        Insert: {
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          direction: string
          id?: string
          instance_id: string
          is_responded?: boolean
          message_body: string
          message_id?: string | null
          remote_jid?: string | null
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          direction?: string
          id?: string
          instance_id?: string
          is_responded?: boolean
          message_body?: string
          message_id?: string | null
          remote_jid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_messages_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_instances'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role: string
        }
        Returns: string
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_update_user: {
        Args: {
          p_full_name: string
          p_password?: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      get_my_role: { Args: never; Returns: string }
      lock_and_get_queue: {
        Args: { p_campaign_id: string; p_limit: number }
        Returns: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          instance_id: string | null
          lead_name: string | null
          phone: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'dispatch_queue'
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
