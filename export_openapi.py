"""
OpenAPI Specification Exporter for AEC Axis API Contract Testing

This script extracts the complete OpenAPI 3.0 specification from our FastAPI
application and exports it as a standardized JSON contract for Dredd testing.
"""
import json
import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

try:
    from app.main import app
    
    def export_openapi_spec():
        """
        Export the OpenAPI specification from FastAPI app to JSON file.
        
        This creates the official API contract that will be used by Dredd
        for contract testing validation.
        """
        # Get the OpenAPI schema from FastAPI
        openapi_schema = app.openapi()
        
        # Ensure the schema has proper server configuration for testing
        if "servers" not in openapi_schema or not openapi_schema["servers"]:
            openapi_schema["servers"] = [
                {
                    "url": "http://127.0.0.1:8001",
                    "description": "Development server"
                }
            ]
        
        # Export path
        output_file = Path(__file__).parent / "openapi.json"
        
        # Write the schema to file
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
        
        print(f"[SUCCESS] OpenAPI specification exported successfully!")
        print(f"Contract file: {output_file}")
        print(f"API Endpoints discovered: {len(openapi_schema.get('paths', {}))}")
        print(f"Schemas defined: {len(openapi_schema.get('components', {}).get('schemas', {}))}")
        
        # Display endpoint summary
        paths = openapi_schema.get('paths', {})
        if paths:
            print(f"\nAPI Contract Summary:")
            for path, methods in paths.items():
                method_list = [method.upper() for method in methods.keys() if method != 'parameters']
                if method_list:
                    print(f"  {path}: {', '.join(method_list)}")
        
        return output_file

    if __name__ == "__main__":
        export_openapi_spec()
        
except ImportError as e:
    print(f"[ERROR] Error importing FastAPI app: {e}")
    print("Make sure you're running this from the project root directory")
    print("Ensure all backend dependencies are installed: pip install -r backend/requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Error exporting OpenAPI spec: {e}")
    sys.exit(1)