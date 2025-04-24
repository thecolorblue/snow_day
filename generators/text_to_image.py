# Import the required libraries
from PIL import Image
import requests
from io import BytesIO
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Function to generate an image using OpenAI's DALL-E API
def generate_image_with_dalle(prompt, api_key):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024"
    }
    
    response = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        image_url = result["data"][0]["url"]
        image_response = requests.get(image_url)
        image = Image.open(BytesIO(image_response.content))
        return image
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

# Main execution
import argparse # Import argparse

if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Generate an image using DALL-E 3 and append a suffix to the prompt.")
    parser.add_argument("-p", "--prompt_suffix", type=str, default="", help="String to append to the base prompt.")
    args = parser.parse_args()
    # Get API key from environment variable
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set.")
        print("Please set your OpenAI API key as an environment variable.")
        print("Example: export OPENAI_API_KEY='your-api-key-here'")
        exit(1)
    
    base_prompt = "80s video game style. A white coffee mug filled with hot chocolate with 3 marshmallows on the top."
    # Append the suffix if provided
    prompt = f"{base_prompt} {args.prompt_suffix}".strip()
    
    print(f"Generating image with prompt: {prompt}")
    image = generate_image_with_dalle(prompt, api_key)
    
    if image:
        image.save("hot-chocolate-mug.png")
        print("Image saved as hot-chocolate-mug.png")
    else:
        print("Failed to generate image")