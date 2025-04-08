#!/usr/bin/env python3
"""
Database initialization script.
This script creates all tables defined in the ORM models.
"""
import os
import logging
from dotenv import load_dotenv
from orm import Base, engine

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    # Load environment variables from .env file
    load_dotenv()
    """Initialize the database by creating all tables defined in the ORM models."""
    try:
        # Check if DATABASE_URL is set
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            logger.error("DATABASE_URL environment variable not set")
            return False
        
        logger.info(f"Creating database tables using connection: {database_url}")
        
        # Create all tables
        Base.metadata.create_all(engine)
        
        logger.info("Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return False

if __name__ == "__main__":
    success = init_db()
    if success:
        logger.info("Database initialization completed successfully")
    else:
        logger.error("Database initialization failed")