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
          name: string
          owner_id: string | null
          proxy_url: string | null
          status: string
          token: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_maturador_active?: boolean
          name: string
          owner_id?: string | null
          proxy_url?: string | null
          status?: string
          token: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_maturador_active?: boolean
          name?: string
          owner_id?: string | null
          proxy_url?: string | null
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

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: campaigns
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   message_text: text (not null)
//   media_url: text (nullable)
//   media_type: text (not null, default: 'TEXT'::text)
//   status: text (not null, default: 'AGUARDANDO'::text)
//   created_by: uuid (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   min_delay: integer (not null, default: 10)
//   max_delay: integer (not null, default: 30)
//   instance_ids: _uuid (not null, default: '{}'::uuid[])
// Table: configuracoes_api
//   id: uuid (not null, default: gen_random_uuid())
//   url_servidor: character varying (not null, default: 'https://api.primaziainvestimentos.com'::character varying)
//   global_api_key: text (not null)
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: dialer_queue
//   id: uuid (not null, default: gen_random_uuid())
//   lead_name: text (nullable)
//   phone: text (not null)
//   status: text (not null, default: 'PENDING'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: dispatch_queue
//   id: uuid (not null, default: gen_random_uuid())
//   campaign_id: uuid (not null)
//   instance_id: uuid (nullable)
//   lead_name: text (nullable)
//   phone: text (not null)
//   status: text (not null, default: 'PENDING'::text)
//   error_message: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: maturador_configs
//   id: uuid (not null, default: gen_random_uuid())
//   dialogue_tree: jsonb (not null, default: '{}'::jsonb)
//   is_active: boolean (not null, default: false)
//   min_delay: integer (not null, default: 40)
//   max_delay: integer (not null, default: 90)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: profiles
//   id: uuid (not null)
//   email: text (not null)
//   full_name: text (not null)
//   role: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   sip_extension: text (nullable)
//   sip_password: text (nullable)
//   sip_domain: text (nullable)
// Table: webhook_logs
//   id: uuid (not null, default: gen_random_uuid())
//   payload: jsonb (not null, default: '{}'::jsonb)
//   event_type: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: whatsapp_instances
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   token: text (not null)
//   status: text (not null, default: 'DESCONECTADO'::text)
//   owner_id: uuid (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   is_maturador_active: boolean (not null, default: false)
//   proxy_url: text (nullable)
//   user_agent: text (nullable)
// Table: whatsapp_messages
//   id: uuid (not null, default: gen_random_uuid())
//   instance_id: uuid (not null)
//   contact_phone: text (not null)
//   contact_name: text (nullable)
//   message_body: text (not null)
//   direction: text (not null)
//   is_responded: boolean (not null, default: false)
//   created_at: timestamp with time zone (not null, default: now())
//   message_id: text (nullable)
//   remote_jid: text (nullable)

// --- CONSTRAINTS ---
// Table: campaigns
//   FOREIGN KEY campaigns_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
//   PRIMARY KEY campaigns_pkey: PRIMARY KEY (id)
// Table: configuracoes_api
//   PRIMARY KEY configuracoes_api_pkey: PRIMARY KEY (id)
// Table: dialer_queue
//   PRIMARY KEY dialer_queue_pkey: PRIMARY KEY (id)
// Table: dispatch_queue
//   FOREIGN KEY dispatch_queue_campaign_id_fkey: FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
//   FOREIGN KEY dispatch_queue_instance_id_fkey: FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL
//   PRIMARY KEY dispatch_queue_pkey: PRIMARY KEY (id)
// Table: maturador_configs
//   PRIMARY KEY maturador_configs_pkey: PRIMARY KEY (id)
// Table: profiles
//   FOREIGN KEY profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY profiles_pkey: PRIMARY KEY (id)
//   CHECK profiles_role_check: CHECK ((role = ANY (ARRAY['master'::text, 'gerente'::text, 'corretor'::text])))
// Table: webhook_logs
//   PRIMARY KEY webhook_logs_pkey: PRIMARY KEY (id)
// Table: whatsapp_instances
//   UNIQUE whatsapp_instances_name_key: UNIQUE (name)
//   FOREIGN KEY whatsapp_instances_owner_id_fkey: FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
//   PRIMARY KEY whatsapp_instances_pkey: PRIMARY KEY (id)
// Table: whatsapp_messages
//   CHECK whatsapp_messages_direction_check: CHECK ((direction = ANY (ARRAY['incoming'::text, 'outgoing'::text])))
//   FOREIGN KEY whatsapp_messages_instance_id_fkey: FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE
//   PRIMARY KEY whatsapp_messages_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: campaigns
//   Policy "Campaigns Corretor all own" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = 'corretor'::text) AND (created_by = auth.uid()))
//     WITH CHECK: ((get_my_role() = 'corretor'::text) AND (created_by = auth.uid()))
//   Policy "Campaigns Corretor select participating" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = 'corretor'::text) AND ((created_by = auth.uid()) OR (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.owner_id = auth.uid()) AND (wi.id = ANY (campaigns.instance_ids)))))))
//   Policy "Campaigns Master/Gerente all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
//     WITH CHECK: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
// Table: configuracoes_api
//   Policy "Configuracoes API Master/Gerente all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
//     WITH CHECK: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
//   Policy "Configuracoes API authenticated select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: dialer_queue
//   Policy "DialerQueue Corretor SELECT" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = 'corretor'::text)
//   Policy "DialerQueue Master/Gerente ALL" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
// Table: dispatch_queue
//   Policy "DispatchQueue Corretor all own" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = 'corretor'::text) AND (campaign_id IN ( SELECT campaigns.id    FROM campaigns   WHERE (campaigns.created_by = auth.uid()))))
//     WITH CHECK: ((get_my_role() = 'corretor'::text) AND (campaign_id IN ( SELECT campaigns.id    FROM campaigns   WHERE (campaigns.created_by = auth.uid()))))
//   Policy "DispatchQueue Master/Gerente all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
//     WITH CHECK: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
// Table: maturador_configs
//   Policy "Maturador Master/Gerente all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
//     WITH CHECK: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
// Table: profiles
//   Policy "Corretor can read self" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (id = auth.uid())
//   Policy "Corretor can update self" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (id = auth.uid())
//     WITH CHECK: (id = auth.uid())
//   Policy "Gerente can manage corretor" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = 'gerente'::text) AND (role = 'corretor'::text))
//     WITH CHECK: ((get_my_role() = 'gerente'::text) AND (role = 'corretor'::text))
//   Policy "Gerente can read all" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = 'gerente'::text)
//   Policy "Master can do all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = 'master'::text)
//     WITH CHECK: (get_my_role() = 'master'::text)
// Table: webhook_logs
//   Policy "Webhook logs select master gerente" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
// Table: whatsapp_instances
//   Policy "Instances Corretor delete self" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = 'corretor'::text) AND (owner_id = auth.uid()))
//   Policy "Instances Corretor insert self" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: ((get_my_role() = 'corretor'::text) AND (owner_id = auth.uid()))
//   Policy "Instances Corretor select self" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = 'corretor'::text) AND (owner_id = auth.uid()))
//   Policy "Instances Corretor update self" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = 'corretor'::text) AND (owner_id = auth.uid()))
//     WITH CHECK: ((get_my_role() = 'corretor'::text) AND (owner_id = auth.uid()))
//   Policy "Instances Master/Gerente all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
//     WITH CHECK: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
// Table: whatsapp_messages
//   Policy "Messages Corretor insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: ((get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text])) OR ((get_my_role() = 'corretor'::text) AND (instance_id IN ( SELECT whatsapp_instances.id    FROM whatsapp_instances   WHERE (whatsapp_instances.owner_id = auth.uid())))))
//   Policy "Messages Corretor select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text])) OR ((get_my_role() = 'corretor'::text) AND (instance_id IN ( SELECT whatsapp_instances.id    FROM whatsapp_instances   WHERE (whatsapp_instances.owner_id = auth.uid())))))
//   Policy "Messages Corretor update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text])) OR ((get_my_role() = 'corretor'::text) AND (instance_id IN ( SELECT whatsapp_instances.id    FROM whatsapp_instances   WHERE (whatsapp_instances.owner_id = auth.uid())))))
//     WITH CHECK: ((get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text])) OR ((get_my_role() = 'corretor'::text) AND (instance_id IN ( SELECT whatsapp_instances.id    FROM whatsapp_instances   WHERE (whatsapp_instances.owner_id = auth.uid())))))
//   Policy "Messages Master/Gerente all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
//     WITH CHECK: (get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))

// --- DATABASE FUNCTIONS ---
// FUNCTION admin_create_user(text, text, text, text)
//   CREATE OR REPLACE FUNCTION public.admin_create_user(p_email text, p_password text, p_full_name text, p_role text)
//    RETURNS uuid
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_user_id UUID;
//     v_my_role TEXT;
//   BEGIN
//     v_my_role := public.get_my_role();
//
//     -- Permission checks
//     IF v_my_role IS NULL OR v_my_role = 'corretor' THEN
//       RAISE EXCEPTION 'Unauthorized: Only Master or Gerente can create users.';
//     END IF;
//
//     IF v_my_role = 'gerente' AND p_role != 'corretor' THEN
//       RAISE EXCEPTION 'Unauthorized: Gerentes can only create corretores.';
//     END IF;
//
//     IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
//       RAISE EXCEPTION 'Um usuário com este email já existe.';
//     END IF;
//
//     v_user_id := gen_random_uuid();
//
//     -- Insert into Auth schema
//     INSERT INTO auth.users (
//       id, instance_id, email, encrypted_password, email_confirmed_at,
//       created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
//       is_super_admin, role, aud,
//       confirmation_token, recovery_token, email_change_token_new,
//       email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token, phone
//     ) VALUES (
//       v_user_id, '00000000-0000-0000-0000-000000000000', p_email, crypt(p_password, gen_salt('bf')), now(),
//       now(), now(), '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', p_full_name),
//       false, 'authenticated', 'authenticated',
//       '', '', '', '', '', '', '', '', NULL
//     );
//
//     -- Insert into Profiles
//     INSERT INTO public.profiles (id, email, full_name, role)
//     VALUES (v_user_id, p_email, p_full_name, p_role);
//
//     RETURN v_user_id;
//   END;
//   $function$
//
// FUNCTION admin_delete_user(uuid)
//   CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_my_role TEXT;
//     v_target_role TEXT;
//   BEGIN
//     v_my_role := public.get_my_role();
//     SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
//
//     -- Permission checks
//     IF v_my_role IS NULL OR v_my_role = 'corretor' THEN
//       RAISE EXCEPTION 'Unauthorized: Only Master or Gerente can delete users.';
//     END IF;
//
//     IF v_my_role = 'gerente' AND v_target_role != 'corretor' THEN
//        RAISE EXCEPTION 'Unauthorized: Gerentes can only delete corretores.';
//     END IF;
//
//     -- Delete from Auth schema (will cascade to profiles)
//     DELETE FROM auth.users WHERE id = p_user_id;
//   END;
//   $function$
//
// FUNCTION admin_update_user(uuid, text, text, text)
//   CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_full_name text, p_role text, p_password text DEFAULT NULL::text)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_my_role TEXT;
//     v_target_role TEXT;
//   BEGIN
//     v_my_role := public.get_my_role();
//     SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
//
//     -- Permission checks
//     IF v_my_role IS NULL OR v_my_role = 'corretor' THEN
//       RAISE EXCEPTION 'Unauthorized: Only Master or Gerente can update users.';
//     END IF;
//
//     IF v_my_role = 'gerente' THEN
//       IF v_target_role != 'corretor' OR p_role != 'corretor' THEN
//          RAISE EXCEPTION 'Unauthorized: Gerentes can only update corretores.';
//       END IF;
//     END IF;
//
//     -- Update Profile
//     UPDATE public.profiles
//     SET full_name = p_full_name, role = p_role, updated_at = now()
//     WHERE id = p_user_id;
//
//     -- Update Password if provided
//     IF p_password IS NOT NULL AND p_password != '' THEN
//       UPDATE auth.users
//       SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
//       WHERE id = p_user_id;
//     END IF;
//   END;
//   $function$
//
// FUNCTION get_my_role()
//   CREATE OR REPLACE FUNCTION public.get_my_role()
//    RETURNS text
//    LANGUAGE sql
//    STABLE SECURITY DEFINER
//   AS $function$
//     SELECT role FROM public.profiles WHERE id = auth.uid();
//   $function$
//
// FUNCTION lock_and_get_queue(uuid, integer)
//   CREATE OR REPLACE FUNCTION public.lock_and_get_queue(p_campaign_id uuid, p_limit integer)
//    RETURNS SETOF dispatch_queue
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     UPDATE public.dispatch_queue
//     SET status = 'PROCESSING'
//     WHERE id IN (
//       SELECT id
//       FROM public.dispatch_queue
//       WHERE campaign_id = p_campaign_id
//         AND status = 'PENDING'
//       LIMIT p_limit
//       FOR UPDATE SKIP LOCKED
//     )
//     RETURNING *;
//   END;
//   $function$
//
// FUNCTION trigger_dispatch_messages()
//   CREATE OR REPLACE FUNCTION public.trigger_dispatch_messages()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF NEW.status = 'DISPARANDO' AND (OLD.status IS NULL OR OLD.status != 'DISPARANDO') THEN
//       BEGIN
//         PERFORM net.http_post(
//           url := COALESCE(
//             current_setting('app.settings.supabase_url', true),
//             'https://uidafexgwtplfnjrgoyi.supabase.co'
//           ) || '/functions/v1/dispatch-messages',
//           headers := '{"Content-Type": "application/json"}'::jsonb,
//           body := jsonb_build_object('campaign_id', NEW.id)
//         );
//       EXCEPTION WHEN OTHERS THEN
//         RAISE NOTICE 'Failed to invoke edge function: %', SQLERRM;
//       END;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: campaigns
//   on_campaign_start_dispatch: CREATE TRIGGER on_campaign_start_dispatch AFTER UPDATE OF status ON public.campaigns FOR EACH ROW EXECUTE FUNCTION trigger_dispatch_messages()

// --- INDEXES ---
// Table: whatsapp_instances
//   CREATE UNIQUE INDEX whatsapp_instances_name_key ON public.whatsapp_instances USING btree (name)
// Table: whatsapp_messages
//   CREATE INDEX idx_whatsapp_messages_contact_phone ON public.whatsapp_messages USING btree (contact_phone)
//   CREATE INDEX idx_whatsapp_messages_created_at ON public.whatsapp_messages USING btree (created_at)
//   CREATE INDEX idx_whatsapp_messages_instance_id ON public.whatsapp_messages USING btree (instance_id)
//   CREATE INDEX idx_whatsapp_messages_is_responded ON public.whatsapp_messages USING btree (is_responded)
//   CREATE INDEX idx_whatsapp_messages_remote_jid ON public.whatsapp_messages USING btree (remote_jid)
//   CREATE UNIQUE INDEX whatsapp_messages_message_id_idx ON public.whatsapp_messages USING btree (message_id) WHERE (message_id IS NOT NULL)
