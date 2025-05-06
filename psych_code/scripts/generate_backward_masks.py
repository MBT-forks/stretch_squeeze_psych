import numpy as np
from PIL import Image
import os
import argparse
import math

def generate_rgb_noise_mask(width, height):
  """
  Generates a single random RGB pixel noise image.

  Args:
      width (int): The width of the mask image in pixels.
      height (int): The height of the mask image in pixels.

  Returns:
      PIL.Image.Image: A PIL Image object representing the noise mask.
  """
  # Create a 3D NumPy array (height, width, channels)
  # Fill with random integers between 0 (inclusive) and 256 (exclusive)
  # Use uint8 data type as Pillow expects 0-255 values for RGB
  noise_array = np.random.randint(0, 256, size=(height, width, 3), dtype=np.uint8)

  # Convert the NumPy array to a PIL Image object
  mask_image = Image.fromarray(noise_array, 'RGB')
  return mask_image

def main():
  """
  Main function to parse arguments and generate mask images.
  """
  parser = argparse.ArgumentParser(
      description="Generate high-contrast random RGB pixel noise backward mask images.",
      formatter_class=argparse.ArgumentDefaultsHelpFormatter # Shows defaults in help
  )

  parser.add_argument(
      '--num_masks',
      type=int,
      default=100,
      help="Number of unique mask images to generate."
  )
  parser.add_argument(
      '--output_dir',
      type=str,
      default="masks",
      help="Directory where the generated mask images will be saved."
  )
  parser.add_argument(
      '--width',
      type=int,
      default=256,
      help="Width of the mask images in pixels."
  )
  parser.add_argument(
      '--height',
      type=int,
      default=256,
      help="Height of the mask images in pixels."
  )
  parser.add_argument(
      '--format',
      type=str,
      default="png",
      choices=['png', 'jpg', 'bmp', 'tiff'],
      help="Image format to save the masks in."
  )
  parser.add_argument(
        '--prefix',
        type=str,
        default="mask_",
        help="Prefix for the generated mask filenames."
    )


  args = parser.parse_args()

  # --- Input Validation ---
  if args.num_masks <= 0:
      print("Error: --num_masks must be a positive integer.")
      return
  if args.width <= 0 or args.height <= 0:
      print("Error: --width and --height must be positive integers.")
      return

  # --- Directory Setup ---
  try:
      # Create the output directory if it doesn't exist
      # exist_ok=True prevents an error if the directory already exists
      os.makedirs(args.output_dir, exist_ok=True)
      print(f"Masks will be saved in: {os.path.abspath(args.output_dir)}")
  except OSError as e:
      print(f"Error creating output directory '{args.output_dir}': {e}")
      return

  # --- Mask Generation ---
  # Determine padding width for filenames (e.g., 100 masks -> 3 digits -> 001, 010, 100)
  num_digits = math.ceil(math.log10(args.num_masks)) if args.num_masks > 0 else 1
  # Ensure at least 3 digits for consistency if fewer than 100 masks
  padding = max(3, num_digits)

  print(f"Generating {args.num_masks} masks ({args.width}x{args.height})...")
  generated_count = 0
  for i in range(args.num_masks):
      try:
          # Generate the mask
          mask = generate_rgb_noise_mask(args.width, args.height)

          # Construct filename with leading zeros
          filename = f"{args.prefix}{i:0{padding}}.{args.format}"
          filepath = os.path.join(args.output_dir, filename)

          # Save the image
          mask.save(filepath)
          generated_count += 1

          # Optional: Print progress
          if (i + 1) % 10 == 0 or (i + 1) == args.num_masks:
              print(f"  Generated {i+1}/{args.num_masks} masks...", end='\r')

      except Exception as e:
          print(f"\nError generating or saving mask {i}: {e}")
          # Decide if you want to stop or continue on error
          # return # Uncomment to stop on first error
          continue # Continue generating other masks

  print(f"\nFinished generating {generated_count} masks.")

if __name__ == "__main__":
  main()