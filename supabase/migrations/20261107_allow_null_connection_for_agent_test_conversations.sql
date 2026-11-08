-- =============================================================================
-- Migration: Allow NULL connection_id for Agent Test Simulator Conversations
-- Purpose:
--   1. Allow `public.conversations.connection_id` to be NULL exclusively for
--      Agent Test Simulator conversations (`customer_handle = '__agent_test_simulator__'`
--      with simulator metadata and a valid `agent_id`).
--   2. Preserve strict workspace relationship validation in
--      `public.assert_same_workspace_relationships()` so:
--      - Agent Test Simulator conversations work with zero connected channels
--        (`connection_id IS NULL`) while still requiring a valid `agent_id`
--        belonging to `NEW.workspace_id`.
--      - Real customer conversations continue requiring a non-null `connection_id`
--        belonging to the same `NEW.workspace_id`.
-- =============================================================================

BEGIN;

-- 1. Allow NULL in `public.conversations.connection_id` at the column level
ALTER TABLE public.conversations
  ALTER COLUMN connection_id DROP NOT NULL;

-- 2. Enforce that `connection_id` may ONLY be NULL for Agent Test Simulator rows;
--    all real customer conversations must still have a non-null `connection_id`.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_connection_or_simulator_check;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_connection_or_simulator_check
  CHECK (
    connection_id IS NOT NULL
    OR (
      agent_id IS NOT NULL
      AND customer_handle = '__agent_test_simulator__'
      AND COALESCE((metadata->>'is_test')::boolean, false) = true
      AND COALESCE(metadata->>'conversation_type', '') = 'agent_test'
      AND COALESCE(metadata->>'source', '') = 'agent_simulator'
      AND COALESCE(metadata->>'platform', '') = 'simulator'
    )
  ) NOT VALID;

ALTER TABLE public.conversations
  VALIDATE CONSTRAINT conversations_connection_or_simulator_check;

-- 3. Update `public.assert_same_workspace_relationships()` to allow
--    `connection_id IS NULL` ONLY for Agent Test Simulator conversations
--    while preserving all workspace relationship checks across tables.
CREATE OR REPLACE FUNCTION public.assert_same_workspace_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_simulator boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'conversations' THEN
    v_is_simulator := (
      NEW.connection_id IS NULL
      AND NEW.agent_id IS NOT NULL
      AND NEW.customer_handle = '__agent_test_simulator__'
      AND COALESCE((NEW.metadata->>'is_test')::boolean, false) = true
      AND COALESCE(NEW.metadata->>'conversation_type', '') = 'agent_test'
      AND COALESCE(NEW.metadata->>'source', '') = 'agent_simulator'
      AND COALESCE(NEW.metadata->>'platform', '') = 'simulator'
    );

    -- Always verify that the agent (when provided, and mandatory for simulator)
    -- belongs to the same workspace.
    IF NEW.agent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.agents a
      WHERE a.id = NEW.agent_id
        AND a.workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Agent must belong to the same workspace';
    END IF;

    -- For real customer conversations (or any non-simulator row), require a valid
    -- channel connection belonging to the same workspace.
    IF NOT v_is_simulator THEN
      IF NEW.connection_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.channel_connections cc
        WHERE cc.id = NEW.connection_id
          AND cc.workspace_id = NEW.workspace_id
      ) THEN
        RAISE EXCEPTION 'Channel connection must belong to the same workspace';
      END IF;
    END IF;

    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'channel_connections' THEN
    IF NEW.agent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.agents a
      WHERE a.id = NEW.agent_id
        AND a.workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Agent must belong to the same workspace';
    END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'knowledge_documents' THEN
    IF NEW.agent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.agents a
      WHERE a.id = NEW.agent_id
        AND a.workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Agent must belong to the same workspace';
    END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'knowledge_chunks' THEN
    IF NEW.agent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.agents a
      WHERE a.id = NEW.agent_id
        AND a.workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Agent must belong to the same workspace';
    END IF;

    IF NEW.document_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.knowledge_documents kd
      WHERE kd.id = NEW.document_id
        AND kd.workspace_id = NEW.workspace_id
        AND (NEW.agent_id IS NULL OR kd.agent_id = NEW.agent_id)
    ) THEN
      RAISE EXCEPTION 'Knowledge document must belong to the same workspace';
    END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = NEW.conversation_id
        AND c.workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Conversation must belong to the same workspace';
    END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'conversation_feedback' THEN
    IF NEW.agent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.agents a
      WHERE a.id = NEW.agent_id
        AND a.workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Agent must belong to the same workspace';
    END IF;

    IF NEW.conversation_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = NEW.conversation_id
        AND c.workspace_id = NEW.workspace_id
        AND (NEW.agent_id IS NULL OR c.agent_id IS NULL OR c.agent_id = NEW.agent_id)
    ) THEN
      RAISE EXCEPTION 'Conversation must belong to the same workspace';
    END IF;

    IF NEW.message_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = NEW.message_id
        AND m.workspace_id = NEW.workspace_id
        AND (NEW.conversation_id IS NULL OR m.conversation_id = NEW.conversation_id)
    ) THEN
      RAISE EXCEPTION 'Message must belong to the same workspace';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
