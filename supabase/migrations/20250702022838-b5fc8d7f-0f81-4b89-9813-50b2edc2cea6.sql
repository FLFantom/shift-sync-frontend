
-- Добавляем поле status в таблицу users
ALTER TABLE public.users 
ADD COLUMN status character varying DEFAULT 'offline';

-- Добавляем поле break_start_time для отслеживания времени начала перерыва
ALTER TABLE public.users 
ADD COLUMN break_start_time timestamp without time zone;
