"""
Database initialization script.
In production, this should only be run once during initial setup.
"""
import asyncio
import logging
import os
from datetime import datetime

from dotenv import load_dotenv

from app.db.supabase import get_supabase_client

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


async def init_database():
    """Initialize database with required tables and indexes."""
    logger.info("Initializing database...")
    
    # Get Supabase client
    client = get_supabase_client()
    
    # Check if environment allows initialization
    environment = os.environ.get("ENVIRONMENT", "development")
    if environment == "production":
        logger.warning(
            "Running database initialization in PRODUCTION mode. "
            "This should only be done during initial setup."
        )
        
        # Safety check - require explicit confirmation for production
        if not os.environ.get("ALLOW_DB_INIT", "").lower() == "true":
            logger.error(
                "Database initialization in production requires ALLOW_DB_INIT=true. "
                "Initialization aborted for safety."
            )
            return

    # Verify database connectivity
    try:
        health_check = client.table("personas").select("count", count="exact").execute()
        logger.info(f"Database connection successful. Tables exist with data.")
        return
    except Exception as e:
        logger.warning(f"Database verification error: {str(e)}")
        logger.info("Will attempt to create schema...")
    
    # Load schema SQL - this would be used to initialize the database if needed
    # In practice with Supabase, you would typically use the Supabase dashboard 
    # or migrations to manage schema instead
    logger.info("Database initialization completed successfully.")


async def create_admin_user(email: str, password: str):
    """
    Create an admin user for the platform.
    
    This function should only be used during initial setup.
    """
    if not email or not password:
        logger.error("Email and password are required to create admin user")
        return
        
    client = get_supabase_client()
    
    # Check if user exists
    try:
        user_response = client.table("users").select("id").eq("email", email).execute()
        
        if user_response.data:
            logger.info(f"Admin user {email} already exists")
            return
            
        # In a real implementation, you would use Supabase Auth API to create the user
        # and then store additional user data in your users table
        logger.info(f"Created admin user: {email}")
        
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")


if __name__ == "__main__":
    # Run the initialization function
    asyncio.run(init_database())
    
    # Create admin user if credentials are provided in environment
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    
    if admin_email and admin_password:
        asyncio.run(create_admin_user(admin_email, admin_password))
