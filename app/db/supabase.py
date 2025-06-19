"""
Supabase client configuration and helper functions.
"""
import os
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Load Supabase configuration from environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

_SUPABASE_CLIENT: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Returns a singleton Supabase client instance.
    """
    global _SUPABASE_CLIENT
    if _SUPABASE_CLIENT is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY environment variables must be set"
            )
        _SUPABASE_CLIENT = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _SUPABASE_CLIENT


def close_supabase_client() -> None:
    """
    Closes the Supabase client connection.
    """
    global _SUPABASE_CLIENT
    if _SUPABASE_CLIENT is not None:
        # Close any open connections
        _SUPABASE_CLIENT = None
