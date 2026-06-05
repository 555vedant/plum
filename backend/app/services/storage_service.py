import os
import uuid
import logging
from app.core.config import settings

logger = logging.getLogger("storage_service")

# Try to initialize Supabase client
supabase_client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}. Falling back to local storage.")

def upload_file(file_content: bytes, original_filename: str) -> str:
 
    # Generate unique filename to avoid collision
    ext = os.path.splitext(original_filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"

    if supabase_client:
        try:
            # Upload to Supabase Storage bucket 'claims'
            # Note: The bucket 'claims' should exist on Supabase, or be public.
            bucket_name = "claims"
            
            # Make sure bucket exists or create if needed (handled on Supabase dashboard normally,
            # but we can try to upload and catch errors)
            res = supabase_client.storage.from_(bucket_name).upload(
                path=unique_filename,
                file=file_content,
                file_options={"content-type": "application/octet-stream"}
            )
            
            # Get public url
            public_url = supabase_client.storage.from_(bucket_name).get_public_url(unique_filename)
            logger.info(f"Uploaded {original_filename} to Supabase storage: {public_url}")
            return public_url
        except Exception as e:
            logger.error(f"Supabase upload failed: {e}. Falling back to local storage.")

    # FALLBACK: Local Storage
    try:
        # Save to app/static/uploads
        static_dir = os.path.join("app", "static", "uploads")
        os.makedirs(static_dir, exist_ok=True)
        
        file_path = os.path.join(static_dir, unique_filename)
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        # The url should be relative to the frontend, e.g. http://localhost:8000/static/uploads/unique_filename
        # Returning /static/uploads/... relative path is safer and frontend can prefix API base url
        local_url = f"/static/uploads/{unique_filename}"
        logger.info(f"Saved {original_filename} to local storage fallback: {local_url}")
        return local_url
    except Exception as e:
        logger.error(f"Local storage save failed: {e}")
        raise RuntimeError(f"Could not save uploaded file: {e}")
