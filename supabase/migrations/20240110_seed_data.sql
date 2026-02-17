INSERT INTO tenants (id, name, slug, logo, brand_color, address, tax_info, invoice_footer, legal_info, payment_methods)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TITAN DEV AI Agency',
  'titan-dev-ai',
  '/logo.png',
  '#00D9FF',
  '42 Innovation Drive, Tech District, Dubai, UAE',
  'VAT# AE-100-2847293',
  'Payment due within 30 days. Late fees of 2% apply.',
  'TITAN DEV AI LLC. Registered in UAE Free Zone.',
  ARRAY['Bank Transfer', 'Credit Card', 'PayPal', 'Crypto (USDT)']
);

INSERT INTO branches (id, tenant_id, name, manager, client_count, status, location) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'Dubai HQ', 'Ahmed Al-Rashid', 45, 'active', 'Dubai, UAE'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'Cairo Branch', 'Fatima Hassan', 32, 'active', 'Cairo, Egypt'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000001', 'Riyadh Office', 'Omar Khalid', 18, 'active', 'Riyadh, KSA'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000001', 'Lagos Outpost', 'Adeola Bakare', 12, 'inactive', 'Lagos, Nigeria');

INSERT INTO user_profiles (id, tenant_id, branch_id, full_name, email, avatar, status, two_factor_enabled, ip_restricted) VALUES
  ('00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Ahmed Al-Rashid', 'ahmed@titandev.ai', 'AR', 'active', true, false),
  ('00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', 'Fatima Hassan', 'fatima@titandev.ai', 'FH', 'active', true, false),
  ('00000000-0000-0000-0000-000000000a03', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Omar Khalid', 'omar@titandev.ai', 'OK', 'active', false, false),
  ('00000000-0000-0000-0000-000000000a04', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Sarah Chen', 'sarah@titandev.ai', 'SC', 'active', true, true),
  ('00000000-0000-0000-0000-000000000a05', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b4', 'Adeola Bakare', 'adeola@titandev.ai', 'AB', 'inactive', false, false),
  ('00000000-0000-0000-0000-000000000a06', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Raj Patel', 'raj@titandev.ai', 'RP', 'suspended', false, true);

INSERT INTO roles (id, tenant_id, name, description, is_system, user_count) VALUES
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full system access with override capabilities', true, 2),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000001', 'Account Manager', 'Client management and project oversight', true, 8),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000001', 'Creative Lead', 'Content creation and deliverable management', true, 5),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-000000000001', 'Finance Officer', 'Financial operations and reporting', false, 3),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000001', 'Media Buyer', 'Ad campaign management and optimization', false, 4);

INSERT INTO permissions (role_id, module, can_create, can_read, can_update, can_delete) VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'clients', true, true, true, true),
  ('00000000-0000-0000-0000-0000000000e1', 'projects', true, true, true, true),
  ('00000000-0000-0000-0000-0000000000e1', 'finance', true, true, true, true),
  ('00000000-0000-0000-0000-0000000000e1', 'media', true, true, true, true),
  ('00000000-0000-0000-0000-0000000000e1', 'team', true, true, true, true),
  ('00000000-0000-0000-0000-0000000000e1', 'settings', true, true, true, true),
  ('00000000-0000-0000-0000-0000000000e2', 'clients', true, true, true, false),
  ('00000000-0000-0000-0000-0000000000e2', 'projects', true, true, true, false),
  ('00000000-0000-0000-0000-0000000000e2', 'finance', false, true, false, false),
  ('00000000-0000-0000-0000-0000000000e2', 'media', true, true, true, false),
  ('00000000-0000-0000-0000-0000000000e2', 'team', false, true, false, false),
  ('00000000-0000-0000-0000-0000000000e2', 'settings', false, false, false, false);

INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-000000000a03', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-000000000a04', '00000000-0000-0000-0000-0000000000e4'),
  ('00000000-0000-0000-0000-000000000a05', '00000000-0000-0000-0000-0000000000e5'),
  ('00000000-0000-0000-0000-000000000a06', '00000000-0000-0000-0000-0000000000e2');

INSERT INTO teams (id, tenant_id, name, category, description, color, icon, total_members, active_tasks, overloaded_members, efficiency_score, lead_name, max_workload_percent) VALUES
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-000000000001', 'Creative Team', 'creative', 'Design, branding, and visual assets', 'cyan', 'palette', 8, 34, 2, 87, 'Omar Khalid', 85),
  ('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-000000000001', 'Video Production', 'video-production', 'Video shoots, editing, and motion graphics', 'purple', 'video', 6, 18, 1, 92, NULL, 85),
  ('00000000-0000-0000-0000-000000000d03', '00000000-0000-0000-0000-000000000001', 'Media Buying', 'media-buying', 'Paid ads across Meta, Google, TikTok', 'magenta', 'megaphone', 5, 42, 3, 78, 'Adeola Bakare', 90),
  ('00000000-0000-0000-0000-000000000d04', '00000000-0000-0000-0000-000000000001', 'Content & Copy', 'content-copy', 'Copywriting, content planning, and social media', 'lime', 'pen-tool', 7, 28, 1, 91, NULL, 85),
  ('00000000-0000-0000-0000-000000000d05', '00000000-0000-0000-0000-000000000001', 'Client Management', 'client-management', 'Account managers and client relations', 'cyan', 'users', 4, 22, 0, 95, 'Fatima Hassan', 80),
  ('00000000-0000-0000-0000-000000000d06', '00000000-0000-0000-0000-000000000001', 'Strategy & Research', 'strategy-research', 'Market research, strategy, and analytics', 'purple', 'target', 3, 12, 0, 89, NULL, 85),
  ('00000000-0000-0000-0000-000000000d07', '00000000-0000-0000-0000-000000000001', 'HR & Admin', 'hr-admin', 'Hiring, onboarding, and office management', 'lime', 'briefcase', 3, 8, 0, 94, NULL, 85),
  ('00000000-0000-0000-0000-000000000d08', '00000000-0000-0000-0000-000000000001', 'Accounts & Finance', 'accounts-finance', 'Invoicing, billing, and financial reports', 'magenta', 'calculator', 3, 15, 1, 88, 'Sarah Chen', 70),
  ('00000000-0000-0000-0000-000000000d09', '00000000-0000-0000-0000-000000000001', 'Automation / AI', 'automation-ai', 'AI workflows, chatbots, and automation', 'cyan', 'brain', 4, 20, 1, 85, NULL, 85),
  ('00000000-0000-0000-0000-000000000d10', '00000000-0000-0000-0000-000000000001', 'Tech & Development', 'tech-development', 'Web dev, app dev, and infrastructure', 'purple', 'code', 5, 26, 2, 82, NULL, 85);

INSERT INTO team_members (id, tenant_id, name, avatar, email, primary_role, secondary_roles, work_capacity_hours, current_load, status, assigned_clients, assigned_packages, active_deliverables, boost_campaigns, tasks_completed_this_month, avg_delivery_time, revision_count, client_rating, join_date) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001', 'Arif Hassan', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', 'arif@titandev.ai', 'Senior Designer', ARRAY['Brand Strategist'], 8, 92, 'busy', ARRAY['TechVista','FoodChain BD','Glamour Plus'], ARRAY['Premium Brand','Standard','Enterprise'], 6, 0, 24, '1.8 days', 3, 4.8, '2022-03-15'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000001', 'Sadia Rahman', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', 'sadia@titandev.ai', 'UI/UX Designer', ARRAY['Motion Designer'], 8, 78, 'online', ARRAY['CloudSync','EduTech BD'], ARRAY['Enterprise','Premium Brand'], 4, 0, 19, '2.1 days', 2, 4.9, '2022-06-01'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000001', 'Tanvir Ahmed', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', 'tanvir@titandev.ai', 'Graphic Designer', ARRAY[]::text[], 8, 65, 'online', ARRAY['FoodChain BD','RealEstate Pro'], ARRAY['Standard','Basic'], 3, 0, 22, '1.5 days', 4, 4.5, '2023-01-10'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-000000000001', 'Nusrat Jahan', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', 'nusrat@titandev.ai', 'Junior Designer', ARRAY['Social Media Designer'], 8, 55, 'online', ARRAY['FashionHub','GreenLife Organic'], ARRAY['Basic','Standard'], 2, 0, 18, '2.5 days', 5, 4.3, '2023-07-20'),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-000000000001', 'Mehedi Hasan', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', 'mehedi@titandev.ai', 'Senior Designer', ARRAY['Art Director'], 8, 88, 'busy', ARRAY['TechVista','CloudSync','AutoParts BD'], ARRAY['Enterprise','Premium Brand','Standard'], 5, 0, 27, '1.6 days', 2, 4.9, '2021-11-01'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000001', 'Fatima Akter', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', 'fatima.a@titandev.ai', 'Brand Designer', ARRAY[]::text[], 6, 72, 'online', ARRAY['Glamour Plus','FashionHub'], ARRAY['Premium Brand','Basic'], 3, 0, 15, '2.0 days', 3, 4.6, '2023-03-15'),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-000000000001', 'Rafiq Ahmed', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafiq', 'rafiq@titandev.ai', 'Account Manager', ARRAY['Client Relations'], 8, 75, 'online', ARRAY['Imperial Motors','Velocity Bikes Showroom'], ARRAY['Royal Dominance'], 4, 2, 20, '1.0 days', 1, 4.9, '2021-06-01'),
  ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-000000000001', 'Nazia Khan', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nazia', 'nazia@titandev.ai', 'Account Manager', ARRAY[]::text[], 8, 68, 'online', ARRAY['Spice Paradise Restaurant'], ARRAY['Infinity Growth'], 3, 1, 16, '1.2 days', 1, 4.7, '2022-01-15'),
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-000000000001', 'Kamal Hossain', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kamal', 'kamal@titandev.ai', 'Account Manager', ARRAY['Strategy'], 8, 82, 'busy', ARRAY['TechCorp Solutions'], ARRAY['Eco Lite'], 5, 0, 14, '1.5 days', 2, 4.4, '2022-09-01');

INSERT INTO team_member_teams (team_member_id, team_id) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000d01'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000d06'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000d01'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000d10'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000d01'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-000000000d01'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-000000000d04'),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-000000000d01'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000d01'),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-000000000d05'),
  ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-000000000d05'),
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-000000000d05');

INSERT INTO user_skills (team_member_id, skill_name, skill_level) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'Photoshop', 5),
  ('00000000-0000-0000-0000-0000000000f1', 'Illustrator', 5),
  ('00000000-0000-0000-0000-0000000000f1', 'Figma', 4),
  ('00000000-0000-0000-0000-0000000000f2', 'Figma', 5),
  ('00000000-0000-0000-0000-0000000000f2', 'After Effects', 4),
  ('00000000-0000-0000-0000-0000000000f2', 'Illustrator', 3),
  ('00000000-0000-0000-0000-0000000000f3', 'Photoshop', 4),
  ('00000000-0000-0000-0000-0000000000f3', 'Illustrator', 3),
  ('00000000-0000-0000-0000-0000000000f4', 'Photoshop', 3),
  ('00000000-0000-0000-0000-0000000000f4', 'Figma', 3),
  ('00000000-0000-0000-0000-0000000000f4', 'Social Media', 4),
  ('00000000-0000-0000-0000-0000000000f5', 'Photoshop', 5),
  ('00000000-0000-0000-0000-0000000000f5', 'Illustrator', 5),
  ('00000000-0000-0000-0000-0000000000f5', 'Figma', 5),
  ('00000000-0000-0000-0000-0000000000f5', 'After Effects', 4),
  ('00000000-0000-0000-0000-0000000000f6', 'Illustrator', 4),
  ('00000000-0000-0000-0000-0000000000f6', 'Figma', 3),
  ('00000000-0000-0000-0000-0000000000f6', 'Photoshop', 4);

INSERT INTO clients (id, tenant_id, business_name, category, location, contact_email, contact_phone, contact_website, account_manager_id, status, health_score) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 'Imperial Motors', 'Motorcycle Dealer', 'Dhaka, Bangladesh', 'info@imperialmotors.bd', '+880 1711-123456', 'https://imperialmotors.bd', '00000000-0000-0000-0000-0000000000f7', 'active', 92),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', 'Spice Paradise Restaurant', 'Restaurant', 'Chittagong, Bangladesh', 'hello@spiceparadise.com', '+880 1812-345678', 'https://spiceparadise.com', '00000000-0000-0000-0000-0000000000f8', 'active', 78),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000001', 'TechCorp Solutions', 'Corporate', 'Sylhet, Bangladesh', 'marketing@techcorp.bd', '+880 1911-987654', NULL, '00000000-0000-0000-0000-0000000000f9', 'at-risk', 58),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-000000000001', 'Velocity Bikes Showroom', 'Motorcycle Dealer', 'Khulna, Bangladesh', 'sales@velocitybikes.bd', '+880 1611-456789', 'https://velocitybikes.bd', '00000000-0000-0000-0000-0000000000f7', 'active', 88);

INSERT INTO client_wallets (client_id, balance, currency) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 125000, 'BDT'),
  ('00000000-0000-0000-0000-0000000000c2', 45000, 'BDT'),
  ('00000000-0000-0000-0000-0000000000c3', 8000, 'BDT'),
  ('00000000-0000-0000-0000-0000000000c4', 95000, 'BDT');

INSERT INTO packages (id, tenant_id, name, plan_type, category, tier, monthly_fee, currency, platform_count, correction_limit, description, features, recommended, is_active) VALUES
  ('00000000-0000-0000-0000-000000000aa1', '00000000-0000-0000-0000-000000000001', 'Infinity Starter', 'Infinity Plan', NULL, 'Starter', 15000, 'BDT', 2, 2, 'Perfect for small businesses', ARRAY['2 Social Media Platforms','Basic Design Package','Monthly Content Calendar','Basic Analytics Report'], false, true),
  ('00000000-0000-0000-0000-000000000aa2', '00000000-0000-0000-0000-000000000001', 'Infinity Growth', 'Infinity Plan', NULL, 'Growth', 35000, 'BDT', 4, 4, 'Ideal for growing businesses', ARRAY['4 Social Media Platforms','Advanced Design Package','Weekly Content Calendar','Detailed Analytics Report'], true, true),
  ('00000000-0000-0000-0000-000000000aa3', '00000000-0000-0000-0000-000000000001', 'Infinity Advanced', 'Infinity Plan', NULL, 'Advanced', 65000, 'BDT', 6, 6, 'Full-service marketing', ARRAY['6 Social Media Platforms','Premium Design Package','Daily Content Calendar','Advanced Analytics'], false, true),
  ('00000000-0000-0000-0000-000000000aa4', '00000000-0000-0000-0000-000000000001', 'Eco Lite Starter', 'Eco Lite', NULL, 'Starter', 18000, 'BDT', 2, 2, 'Budget-friendly entry plan', ARRAY['2 Platforms','Basic Design','Monthly Report'], false, true),
  ('00000000-0000-0000-0000-000000000aa5', '00000000-0000-0000-0000-000000000001', 'Royal Dominance Package', 'Category-Based', 'Motorcycle Dealer', 'Advanced', 85000, 'BDT', 8, 8, 'Premium package for motorcycle dealerships', ARRAY['8 Social Media Platforms','Full Design Suite','Video Production'], false, true);

INSERT INTO package_features (package_id, deliverable_type, label, icon, total_allocated, unit_label) VALUES
  ('00000000-0000-0000-0000-000000000aa1', 'photo_graphics', 'Photo/Graphics Design', 'image', 8, 'designs'),
  ('00000000-0000-0000-0000-000000000aa1', 'video_edit', 'Video Edit', 'video', 2, 'videos'),
  ('00000000-0000-0000-0000-000000000aa1', 'copywriting', 'Copywriting', 'pen-tool', 10, 'copies'),
  ('00000000-0000-0000-0000-000000000aa1', 'boost_campaign', 'Boost Campaign', 'rocket', 1, 'campaigns'),
  ('00000000-0000-0000-0000-000000000aa2', 'photo_graphics', 'Photo/Graphics Design', 'image', 12, 'designs'),
  ('00000000-0000-0000-0000-000000000aa2', 'video_edit', 'Video Edit', 'video', 4, 'videos'),
  ('00000000-0000-0000-0000-000000000aa2', 'copywriting', 'Copywriting', 'pen-tool', 20, 'copies'),
  ('00000000-0000-0000-0000-000000000aa2', 'boost_campaign', 'Boost Campaign', 'rocket', 3, 'campaigns'),
  ('00000000-0000-0000-0000-000000000aa5', 'photo_graphics', 'Photo/Graphics Design', 'image', 15, 'designs'),
  ('00000000-0000-0000-0000-000000000aa5', 'video_edit', 'Video Edit', 'video', 8, 'videos'),
  ('00000000-0000-0000-0000-000000000aa5', 'copywriting', 'Copywriting', 'pen-tool', 25, 'copies'),
  ('00000000-0000-0000-0000-000000000aa5', 'boost_campaign', 'Boost Campaign', 'rocket', 5, 'campaigns'),
  ('00000000-0000-0000-0000-000000000aa4', 'photo_graphics', 'Photo/Graphics Design', 'image', 6, 'designs'),
  ('00000000-0000-0000-0000-000000000aa4', 'video_edit', 'Video Edit', 'video', 2, 'videos'),
  ('00000000-0000-0000-0000-000000000aa4', 'copywriting', 'Copywriting', 'pen-tool', 10, 'copies'),
  ('00000000-0000-0000-0000-000000000aa4', 'boost_campaign', 'Boost Campaign', 'rocket', 1, 'campaigns');

INSERT INTO client_packages (id, client_id, package_id, start_date, renewal_date, status) VALUES
  ('00000000-0000-0000-0000-000000000ab1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000aa5', '2024-01-01', '2024-12-31', 'active'),
  ('00000000-0000-0000-0000-000000000ab2', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000aa2', '2024-03-15', '2025-03-14', 'active'),
  ('00000000-0000-0000-0000-000000000ab3', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000aa4', '2024-05-01', '2024-11-01', 'active'),
  ('00000000-0000-0000-0000-000000000ab4', '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-000000000aa5', '2024-02-01', '2025-01-31', 'active');

INSERT INTO package_usage (client_package_id, deliverable_type, used, total) VALUES
  ('00000000-0000-0000-0000-000000000ab1', 'photo_graphics', 8, 15),
  ('00000000-0000-0000-0000-000000000ab1', 'video_edit', 3, 8),
  ('00000000-0000-0000-0000-000000000ab1', 'copywriting', 12, 25),
  ('00000000-0000-0000-0000-000000000ab1', 'boost_campaign', 2, 5),
  ('00000000-0000-0000-0000-000000000ab2', 'photo_graphics', 6, 12),
  ('00000000-0000-0000-0000-000000000ab2', 'video_edit', 2, 4),
  ('00000000-0000-0000-0000-000000000ab2', 'copywriting', 8, 20),
  ('00000000-0000-0000-0000-000000000ab2', 'boost_campaign', 1, 3),
  ('00000000-0000-0000-0000-000000000ab3', 'photo_graphics', 4, 6),
  ('00000000-0000-0000-0000-000000000ab3', 'video_edit', 1, 2),
  ('00000000-0000-0000-0000-000000000ab3', 'copywriting', 9, 10),
  ('00000000-0000-0000-0000-000000000ab3', 'boost_campaign', 1, 1),
  ('00000000-0000-0000-0000-000000000ab4', 'photo_graphics', 12, 15),
  ('00000000-0000-0000-0000-000000000ab4', 'video_edit', 6, 8),
  ('00000000-0000-0000-0000-000000000ab4', 'copywriting', 18, 25),
  ('00000000-0000-0000-0000-000000000ab4', 'boost_campaign', 4, 5);

INSERT INTO client_performance (client_id, posts_published, reels_published, customer_frames_delivered, review_videos_delivered, ad_spend_this_month, leads_generated, test_ride_bookings, period_start, period_end) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 24, 8, 15, 6, 45000, 127, 43, '2024-01-01', '2024-01-31'),
  ('00000000-0000-0000-0000-0000000000c4', 18, 6, 12, 4, 38000, 89, 31, '2024-01-01', '2024-01-31');

INSERT INTO activities (tenant_id, client_id, type, title, description, timestamp, metadata) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'deliverable_created', 'Design Deliverable Created', 'Customer Frame Design for Royal Enfield Meteor', '2024-01-15T10:30:00Z', '{"deliverableType": "Customer Frame"}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'boost_launched', 'Boost Campaign Launched', 'Meta Ads - New Year Sale Campaign', '2024-01-14T14:20:00Z', '{"platform": "Meta", "amount": 15000, "currency": "BDT"}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'payment_received', 'Payment Received', 'Monthly package fee payment', '2024-01-01T09:00:00Z', '{"amount": 85000, "currency": "BDT", "status": "completed"}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'approval_given', 'Approval Given', 'Review Video approved for publication', '2024-01-13T16:45:00Z', '{}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'deliverable_created', 'Video Deliverable Created', 'Food Reel - Biryani Special', '2024-01-12T11:15:00Z', '{"deliverableType": "Food Reel"}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'revision_requested', 'Revision Requested', 'Menu poster design revision needed', '2024-01-11T13:30:00Z', '{}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3', 'invoice_generated', 'Invoice Generated', 'Monthly package invoice #INV-2024-003', '2024-01-10T08:00:00Z', '{"amount": 18000, "currency": "BDT", "status": "pending"}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c4', 'boost_launched', 'Boost Campaign Launched', 'Google Ads - Showroom Visit Campaign', '2024-01-09T15:00:00Z', '{"platform": "Google", "amount": 20000, "currency": "BDT"}');

INSERT INTO dashboard_metrics (tenant_id, metric_key, title, value, change, change_type, icon, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'revenue', 'Revenue This Month', '$127,450', '+12.5%', 'positive', 'dollar-sign', 'cyan'),
  ('00000000-0000-0000-0000-000000000001', 'campaigns', 'Active Campaigns', '24', '+3 new', 'positive', 'rocket', 'purple'),
  ('00000000-0000-0000-0000-000000000001', 'package_usage', 'Package Usage', '78%', '-2.1%', 'negative', 'package', 'magenta'),
  ('00000000-0000-0000-0000-000000000001', 'utilization', 'Team Utilization', '91%', '+5.3%', 'positive', 'users', 'lime');

INSERT INTO notifications (tenant_id, category, title, description, read) VALUES
  ('00000000-0000-0000-0000-000000000001', 'urgent', 'Server budget exceeded', 'AWS costs exceeded the monthly threshold by 12%', false),
  ('00000000-0000-0000-0000-000000000001', 'financial', 'Payment received — $8,500', 'TechStart Inc paid Invoice #1247', false),
  ('00000000-0000-0000-0000-000000000001', 'client', 'New client inquiry', 'BluePeak Studios requested a consultation', false),
  ('00000000-0000-0000-0000-000000000001', 'team', 'PTO request — Sarah K.', 'Requested Dec 23-Jan 2 time off', true),
  ('00000000-0000-0000-0000-000000000001', 'financial', 'Invoice overdue — UrbanFit', 'Invoice #1239 is 15 days overdue ($4,200)', true),
  ('00000000-0000-0000-0000-000000000001', 'client', 'Contract renewal due', 'NovaBrand contract expires in 30 days', true);

INSERT INTO ai_insights (tenant_id, type, title, description, confidence, action) VALUES
  ('00000000-0000-0000-0000-000000000001', 'warning', 'Cash flow dip predicted', 'Based on pending invoices and scheduled expenses, a cash flow dip is predicted in 14 days.', 87, 'View Invoices'),
  ('00000000-0000-0000-0000-000000000001', 'prediction', 'Client X likely to churn', 'UrbanFit engagement has dropped 40% in the last 30 days.', 73, 'Schedule Call'),
  ('00000000-0000-0000-0000-000000000001', 'opportunity', 'Upsell opportunity detected', 'Acme Corp campaign performance suggests premium analytics package.', 81, 'Create Proposal');

INSERT INTO projects (tenant_id, client_id, title, client_name, status, deadline, days_left, progress) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'Q4 Social Campaign', 'Acme Corp', 'in-progress', '2024-12-15', 12, 65),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'Website Redesign', 'TechStart Inc', 'review', '2024-12-08', 5, 90),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3', 'Brand Identity Package', 'NovaBrand', 'briefing', '2024-12-22', 19, 15),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c4', 'Holiday Ads Suite', 'Zenith Co', 'in-progress', '2024-12-10', 7, 45),
  ('00000000-0000-0000-0000-000000000001', NULL, 'SEO Audit Report', 'FreshMart', 'delivered', '2024-11-30', 0, 100),
  ('00000000-0000-0000-0000-000000000001', NULL, 'PPC Strategy', 'Apex Digital', 'briefing', '2025-01-05', 33, 10),
  ('00000000-0000-0000-0000-000000000001', NULL, 'Content Calendar Q1', 'UrbanFit', 'in-progress', '2024-12-20', 17, 35);

INSERT INTO revenue_chart_data (tenant_id, day, revenue, expenses) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Nov 1', 4200, 2800),
  ('00000000-0000-0000-0000-000000000001', 'Nov 3', 3800, 2600),
  ('00000000-0000-0000-0000-000000000001', 'Nov 5', 5100, 3100),
  ('00000000-0000-0000-0000-000000000001', 'Nov 7', 4600, 2900),
  ('00000000-0000-0000-0000-000000000001', 'Nov 9', 6200, 3400),
  ('00000000-0000-0000-0000-000000000001', 'Nov 11', 5800, 3200),
  ('00000000-0000-0000-0000-000000000001', 'Nov 13', 4900, 2700),
  ('00000000-0000-0000-0000-000000000001', 'Nov 15', 7100, 3600),
  ('00000000-0000-0000-0000-000000000001', 'Nov 17', 6500, 3300),
  ('00000000-0000-0000-0000-000000000001', 'Nov 19', 5400, 3000),
  ('00000000-0000-0000-0000-000000000001', 'Nov 21', 6800, 3500),
  ('00000000-0000-0000-0000-000000000001', 'Nov 23', 7500, 3800),
  ('00000000-0000-0000-0000-000000000001', 'Nov 25', 8200, 4100),
  ('00000000-0000-0000-0000-000000000001', 'Nov 27', 7800, 3700),
  ('00000000-0000-0000-0000-000000000001', 'Nov 29', 6900, 3200),
  ('00000000-0000-0000-0000-000000000001', 'Dec 1', 8500, 4200),
  ('00000000-0000-0000-0000-000000000001', 'Dec 3', 9100, 4500);

INSERT INTO system_settings (tenant_id, section, config) VALUES
  ('00000000-0000-0000-0000-000000000001', 'client_rules', '{"maxClientsPerManager": 15, "autoAssignManager": true, "clientPortalEnabled": true, "healthScoreWeights": {"engagement": 40, "paymentDelay": 35, "usageOverLimit": 25}}'),
  ('00000000-0000-0000-0000-000000000001', 'package_behavior', '{"autoDeduction": true, "warningThresholdPercent": 20, "graceUsageLimitPercent": 10, "autoUpgradeSuggestion": true, "customCreditEnabled": false}'),
  ('00000000-0000-0000-0000-000000000001', 'messaging_rules', '{"autoCreateChannels": true, "clientCanCreateChannels": false, "internalChannelVisibility": "team", "editTimeLimit": 15}'),
  ('00000000-0000-0000-0000-000000000001', 'media_buying', '{"allowManualBudgetOverride": true, "minimumBudget": 100, "autoWalletDeduction": true, "allowNegativeBalance": false}'),
  ('00000000-0000-0000-0000-000000000001', 'finance_rules', '{"defaultTemplate": "Modern Dark", "autoInvoiceGeneration": true, "recurringBillingCycle": "monthly"}'),
  ('00000000-0000-0000-0000-000000000001', 'ai_config', '{"model": "hybrid", "monthlyUsageCap": 10000, "perClientLimit": 500}'),
  ('00000000-0000-0000-0000-000000000001', 'theme_config', '{"activePreset": "cyber-midnight", "globalOverride": false, "perUserThemeAllowed": true, "dashboardLayout": "extended"}'),
  ('00000000-0000-0000-0000-000000000001', 'backup_config', '{"recycleBinRetention": 30, "permanentDeleteRule": "admin-only", "dailyDbSnapshot": true}'),
  ('00000000-0000-0000-0000-000000000001', 'emergency_controls', '{"maintenanceMode": false, "messagingDisabled": false, "boostDisabled": false}');

INSERT INTO error_logs (tenant_id, type, message, severity, resolved) VALUES
  ('00000000-0000-0000-0000-000000000001', 'api', 'Meta API rate limit exceeded on ad account ACT_8472', 'warning', false),
  ('00000000-0000-0000-0000-000000000001', 'payment', 'Stripe webhook timeout for invoice INV-0847', 'critical', false),
  ('00000000-0000-0000-0000-000000000001', 'messaging', 'WebSocket reconnection failed for 3 clients', 'warning', true),
  ('00000000-0000-0000-0000-000000000001', 'api', 'Google Ads API authentication token expired', 'critical', false),
  ('00000000-0000-0000-0000-000000000001', 'payment', 'Currency conversion error on Egyptian Pound transaction', 'info', true),
  ('00000000-0000-0000-0000-000000000001', 'messaging', 'File upload exceeded size limit (client: Imperial Motors)', 'info', true);

INSERT INTO change_log (tenant_id, section, field, old_value, new_value, changed_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'packages', 'autoDeduction', 'false', 'true', 'Ahmed Al-Rashid'),
  ('00000000-0000-0000-0000-000000000001', 'messaging', 'editTimeLimit', '30', '15', 'Ahmed Al-Rashid'),
  ('00000000-0000-0000-0000-000000000001', 'clients', 'maxClientsPerManager', '12', '15', 'Ahmed Al-Rashid'),
  ('00000000-0000-0000-0000-000000000001', 'ai-automation', 'model', 'openai', 'hybrid', 'Ahmed Al-Rashid'),
  ('00000000-0000-0000-0000-000000000001', 'security', 'maintenanceMode', 'true', 'false', 'Ahmed Al-Rashid'),
  ('00000000-0000-0000-0000-000000000001', 'finance', 'autoInvoiceGeneration', 'false', 'true', 'Sarah Chen');

INSERT INTO workspaces (id, tenant_id, client_id, client_name, client_logo, last_message, last_message_time, unread_count, pinned, status, health_score, package_usage) VALUES
  ('00000000-0000-0000-0000-000000000ba1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'Acme Corp', 'AC', 'Can we discuss the Q4 campaign timeline?', NOW() - INTERVAL '2 minutes', 5, true, 'active', 92, 65),
  ('00000000-0000-0000-0000-000000000ba2', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'TechStart Inc', 'TI', 'Invoice #1247 has been paid', NOW() - INTERVAL '15 minutes', 2, true, 'active', 88, 78),
  ('00000000-0000-0000-0000-000000000ba3', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3', 'NovaBrand', 'NB', 'Landing page design approved!', NOW() - INTERVAL '2 hours', 0, false, 'active', 76, 45),
  ('00000000-0000-0000-0000-000000000ba4', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c4', 'Zenith Co', 'ZC', 'Holiday campaign assets ready for review', NOW() - INTERVAL '1 hour', 3, false, 'active', 85, 82),
  ('00000000-0000-0000-0000-000000000ba5', '00000000-0000-0000-0000-000000000001', NULL, 'FreshMart', 'FM', 'Budget alert: 90% of ad spend used', NOW() - INTERVAL '3 hours', 1, false, 'at-risk', 52, 90),
  ('00000000-0000-0000-0000-000000000ba6', '00000000-0000-0000-0000-000000000001', NULL, 'UrbanFit', 'UF', 'Where is the November content report?', NOW() - INTERVAL '5 hours', 8, false, 'churning', 34, 95);

INSERT INTO channels (id, workspace_id, name, type, icon, unread_count, is_hidden) VALUES
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-000000000ba1', 'general', 'general', 'hash', 3, false),
  ('00000000-0000-0000-0000-000000000ca2', '00000000-0000-0000-0000-000000000ba1', 'deliverables', 'deliverables', 'package', 1, false),
  ('00000000-0000-0000-0000-000000000ca3', '00000000-0000-0000-0000-000000000ba1', 'boost-requests', 'boost-requests', 'rocket', 1, false),
  ('00000000-0000-0000-0000-000000000ca4', '00000000-0000-0000-0000-000000000ba1', 'billing', 'billing', 'credit-card', 0, false),
  ('00000000-0000-0000-0000-000000000ca5', '00000000-0000-0000-0000-000000000ba1', 'internal', 'internal', 'lock', 0, true);
