CREATE TYPE ride_status AS ENUM ('REQUESTED', 'SEARCHING', 'ASSIGNED', 'TIMEOUT');

CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status ride_status DEFAULT 'REQUESTED',
    driver_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
