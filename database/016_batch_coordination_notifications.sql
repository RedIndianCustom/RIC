-- ============================================================================
-- 016: Batch Coordination & Notifications System
-- ============================================================================
-- Creates tables and functions for batch coordination workflow:
-- - Batch location assignments
-- - Floor staff notifications
-- - Batch activities tracking
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    priority TEXT NOT NULL DEFAULT 'normal',
    related_entity_type TEXT, -- 'batch', 'shipment', 'inventory_unit', etc.
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_notification_type CHECK (
        type IN ('info', 'success', 'warning', 'error', 'task')
    ),
    CONSTRAINT chk_notification_priority CHECK (
        priority IN ('low', 'normal', 'high', 'urgent')
    )
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON public.notifications(related_entity_type, related_entity_id);

-- ============================================================================
-- 2. BATCH ACTIVITIES TABLE (for tracking batch workflow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.batch_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    old_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_batch_activity_type CHECK (
        activity_type IN (
            'created', 'location_assigned', 'location_changed',
            'status_changed', 'inventory_registered', 'barcode_generated',
            'notification_sent', 'approved', 'rejected', 'closed'
        )
    )
);

-- Indexes for batch activities
CREATE INDEX IF NOT EXISTS idx_batch_activities_batch_id ON public.batch_activities(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_activities_created_at ON public.batch_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_activities_type ON public.batch_activities(activity_type);

-- ============================================================================
-- 3. ADD WAREHOUSE LOCATION TO BATCHES
-- ============================================================================

ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS warehouse_location_id UUID 
    REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;

ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS location_assigned_at TIMESTAMPTZ;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS location_assigned_by UUID 
    REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batches_warehouse_location ON public.batches(warehouse_location_id);

-- ============================================================================
-- 4. FUNCTION: Assign Warehouse Location to Batch
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_batch_location(
    p_batch_id UUID,
    p_location_id UUID,
    p_assigned_by UUID,
    p_notify_warehouse_staff BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch RECORD;
    v_location RECORD;
    v_warehouse_staff_ids UUID[];
    v_notification_id UUID;
    v_result JSONB;
BEGIN
    -- Get batch details
    SELECT 
        b.*,
        p.sku,
        p.brand,
        p.model,
        s.shipment_number
    INTO v_batch
    FROM public.batches b
    LEFT JOIN public.products p ON p.id = b.product_id
    LEFT JOIN public.shipments s ON s.id = b.shipment_id
    WHERE b.id = p_batch_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch not found: %', p_batch_id;
    END IF;
    
    -- Get location details
    SELECT * INTO v_location
    FROM public.warehouse_locations
    WHERE id = p_location_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Warehouse location not found: %', p_location_id;
    END IF;
    
    -- Check if location has capacity
    IF v_location.status = 'full' THEN
        RAISE EXCEPTION 'Location % is at full capacity', v_location.code;
    END IF;
    
    IF v_location.status = 'maintenance' THEN
        RAISE EXCEPTION 'Location % is under maintenance', v_location.code;
    END IF;
    
    -- Update batch with location
    UPDATE public.batches
    SET 
        warehouse_location_id = p_location_id,
        location_assigned_at = NOW(),
        location_assigned_by = p_assigned_by,
        updated_at = NOW()
    WHERE id = p_batch_id;
    
    -- Log activity
    INSERT INTO public.batch_activities (
        batch_id,
        activity_type,
        description,
        performed_by,
        old_value,
        new_value,
        metadata
    ) VALUES (
        p_batch_id,
        CASE 
            WHEN v_batch.warehouse_location_id IS NULL THEN 'location_assigned'
            ELSE 'location_changed'
        END,
        format('Batch %s assigned to location %s', v_batch.batch_number, v_location.code),
        p_assigned_by,
        CASE 
            WHEN v_batch.warehouse_location_id IS NOT NULL 
            THEN jsonb_build_object('location_id', v_batch.warehouse_location_id)
            ELSE NULL
        END,
        jsonb_build_object('location_id', p_location_id, 'location_code', v_location.code),
        jsonb_build_object(
            'location_name', v_location.name,
            'zone', v_location.zone,
            'aisle', v_location.aisle
        )
    );
    
    -- Notify warehouse staff if requested
    IF p_notify_warehouse_staff THEN
        -- Get warehouse staff user IDs
        SELECT ARRAY_AGG(DISTINCT ur.user_id)
        INTO v_warehouse_staff_ids
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE r.name IN ('warehouse_staff', 'operational_staff');
        
        -- Create notifications for each warehouse staff member
        IF v_warehouse_staff_ids IS NOT NULL THEN
            FOREACH v_notification_id IN ARRAY v_warehouse_staff_ids
            LOOP
                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    type,
                    priority,
                    related_entity_type,
                    related_entity_id,
                    action_url,
                    metadata
                ) VALUES (
                    v_notification_id,
                    'New Batch Assigned to Location',
                    format(
                        'Batch %s (%s %s) has been assigned to location %s. Please prepare for storage.',
                        v_batch.batch_number,
                        v_batch.brand,
                        v_batch.model,
                        v_location.code
                    ),
                    'task',
                    'normal',
                    'batch',
                    p_batch_id,
                    '/dashboard/warehouse/batch/' || p_batch_id,
                    jsonb_build_object(
                        'batch_number', v_batch.batch_number,
                        'location_code', v_location.code,
                        'location_name', v_location.name,
                        'product_sku', v_batch.sku,
                        'shipment_number', v_batch.shipment_number
                    )
                );
            END LOOP;
            
            -- Log notification activity
            INSERT INTO public.batch_activities (
                batch_id,
                activity_type,
                description,
                performed_by,
                metadata
            ) VALUES (
                p_batch_id,
                'notification_sent',
                format('Notified %s warehouse staff members', ARRAY_LENGTH(v_warehouse_staff_ids, 1)),
                p_assigned_by,
                jsonb_build_object('notification_count', ARRAY_LENGTH(v_warehouse_staff_ids, 1))
            );
        END IF;
    END IF;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', TRUE,
        'batch_id', p_batch_id,
        'batch_number', v_batch.batch_number,
        'location_id', p_location_id,
        'location_code', v_location.code,
        'location_name', v_location.name,
        'notifications_sent', COALESCE(ARRAY_LENGTH(v_warehouse_staff_ids, 1), 0)
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to assign batch location: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 5. FUNCTION: Get Available Warehouse Locations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_warehouse_locations(
    p_min_capacity INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    zone VARCHAR,
    aisle VARCHAR,
    rack VARCHAR,
    shelf VARCHAR,
    capacity INTEGER,
    current_stock INTEGER,
    available_capacity INTEGER,
    utilization_percentage NUMERIC,
    status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id,
        wl.code,
        wl.name,
        wl.zone,
        wl.aisle,
        wl.rack,
        wl.shelf,
        wl.capacity,
        wl.current_stock,
        (wl.capacity - wl.current_stock) AS available_capacity,
        ROUND((wl.current_stock::NUMERIC / NULLIF(wl.capacity, 0)) * 100, 2) AS utilization_percentage,
        wl.status
    FROM public.warehouse_locations wl
    WHERE wl.status IN ('active', 'empty')
        AND (wl.capacity - wl.current_stock) >= p_min_capacity
    ORDER BY 
        wl.zone,
        wl.aisle,
        wl.rack,
        wl.shelf;
END;
$$;

-- ============================================================================
-- 6. FUNCTION: Mark Notification as Read
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET 
        is_read = TRUE,
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id
        AND user_id = p_user_id
        AND is_read = FALSE;
    
    RETURN FOUND;
END;
$$;

-- ============================================================================
-- 7. FUNCTION: Get User Notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    priority TEXT,
    related_entity_type TEXT,
    related_entity_id UUID,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.message,
        n.type,
        n.priority,
        n.related_entity_type,
        n.related_entity_id,
        n.is_read,
        n.read_at,
        n.action_url,
        n.metadata,
        n.created_at
    FROM public.notifications n
    WHERE n.user_id = p_user_id
        AND (NOT p_unread_only OR n.is_read = FALSE)
    ORDER BY 
        n.is_read ASC,
        n.priority DESC,
        n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for all users"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Batch activities RLS
ALTER TABLE public.batch_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view batch activities"
    ON public.batch_activities FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Authenticated users can create batch activities"
    ON public.batch_activities FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.batch_activities TO authenticated;
GRANT EXECUTE ON FUNCTION assign_batch_location TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_warehouse_locations TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications TO authenticated;

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Batch coordination & notifications system created successfully!' AS status;
SELECT COUNT(*) as notification_count FROM public.notifications;
SELECT COUNT(*) as batch_activity_count FROM public.batch_activities;

