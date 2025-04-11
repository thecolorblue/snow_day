import os
import sys

# Add the project root directory (parent of 'src') to the Python path
# This allows absolute imports like 'from src import module'
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)