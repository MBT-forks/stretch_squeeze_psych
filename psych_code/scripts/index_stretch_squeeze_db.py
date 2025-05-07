import argparse
import os
import json
import pandas as pd
from pathlib import Path
from tqdm import tqdm
import re

def parse_args():
    parser = argparse.ArgumentParser(description='Index a dataset directory structure and create a dirmap CSV file.')
    parser.add_argument('--dataset_path', type=str, required=True,
                        help='Path to the root of the dataset directory.')
    parser.add_argument('--class_alias_json', type=str, required=True,
                        help='Path to the JSON file mapping original class indices to class names.')
    parser.add_argument('--csv_path', type=str, default='dataset_dirmap.csv',
                        help='Path to save the output dirmap CSV file (default: dataset_dirmap.csv).')
    return parser.parse_args()

def validate_directory_structure(dataset_path):
    base_dirs = ['natural', 'robust resnet50', 'vanilla resnet50']
    natural_sub_dirs_regex = r'unit \[\d+\]'

    for base_dir in base_dirs:
        base_path = Path(dataset_path) / base_dir
        if not base_path.is_dir():
            print(f"Warning: Expected base directory '{base_dir}' not found.")
            continue

        if base_dir == 'natural':
            for item in os.listdir(base_path):
                item_path = base_path / item
                if item_path.is_dir() and re.fullmatch(natural_sub_dirs_regex, item):
                    if not any(f for f in os.listdir(item_path) if (item_path / f).is_file() and Path(f).suffix.lower() in ['.png', '.jpeg', '.jpg', '.gif']):
                        print(f"Warning: No image files found in natural class directory: '{item_path}'.")
                elif item_path.is_file() and Path(item).suffix.lower() not in ['.png', '.jpeg', '.jpg', '.gif']:
                    print(f"Warning: Unexpected non-image file found in 'natural' directory: '{item_path}'.")
                elif item_path.is_dir() and not re.fullmatch(natural_sub_dirs_regex, item):
                    print(f"Warning: Unexpected subdirectory found in 'natural' directory: '{item}'. Expected 'unit [num]' folders.")
                elif not item_path.is_dir() and not item_path.is_file():
                    print(f"Warning: Unexpected item found in 'natural' directory: '{item}'.")

        elif base_dir in ['robust resnet50', 'vanilla resnet50']:
            expected_leaf_dirs = ['Stretch in conv25', 'Stretch in conv51', 'Stretch in pixelspace']
            if base_dir == 'robust resnet50':
                expected_leaf_dirs.append('mXDREAM - l2robust')
            else:
                expected_leaf_dirs.append('mXDREAM - vanilla')

            for unit_dir_name in os.listdir(base_path):
                unit_path = base_path / unit_dir_name
                if unit_path.is_dir() and re.fullmatch(r'unit \[\d+\]', unit_dir_name):
                    leaf_dirs_found = [d.name for d in unit_path.iterdir() if d.is_dir()]
                    for expected_leaf_dir in expected_leaf_dirs:
                        if expected_leaf_dir not in leaf_dirs_found:
                            print(f"Warning: Expected leaf directory '{expected_leaf_dir}' not found in '{unit_path}'.")
                    for item in os.listdir(unit_path):
                        item_path = unit_path / item
                        if item_path.is_file():
                            print(f"Warning: Unexpected file found in unit directory '{unit_path}': '{item}'. Expected subdirectories.")
                        elif item_path.is_dir() and item not in expected_leaf_dirs:
                            print(f"Warning: Unexpected subdirectory found in unit directory '{unit_path}': '{item}'.")
                elif unit_path.is_file():
                    print(f"Warning: Unexpected file found in '{base_dir}' directory: '{unit_path}'. Expected 'unit [num]' folders.")
                elif not re.fullmatch(r'unit \[\d+\]', unit_dir_name):
                    print(f"Warning: Unexpected directory found in '{base_dir}' directory: '{unit_path}'. Expected 'unit [num]' folders.")

def main():
    args = parse_args()
    dataset_path = Path(args.dataset_path).resolve()
    class_alias_json_path = Path(args.class_alias_json).resolve()
    csv_path = Path(args.csv_path).resolve()
    csv_path.parent.mkdir(parents=True, exist_ok=True)

    if not dataset_path.is_dir():
        raise FileNotFoundError(f"Dataset path not found: {dataset_path}")
    if not class_alias_json_path.is_file():
        raise FileNotFoundError(f"Class alias JSON file not found: {class_alias_json_path}")

    print("Validating directory structure...")
    validate_directory_structure(dataset_path)
    print("Directory structure validation complete.")

    with open(class_alias_json_path, 'r') as f:
        class_aliases = json.load(f)

    image_data = []
    image_extensions = ['.png', '.jpeg', '.jpg', '.gif']

    for base_dir in tqdm(os.listdir(dataset_path), desc="Processing base directories"):
        base_path = dataset_path / base_dir
        if not base_path.is_dir():
            continue

        if base_dir == 'natural':
            for unit_dir_name in os.listdir(base_path):
                unit_path = base_path / unit_dir_name
                if unit_path.is_dir() and re.fullmatch(r'unit \[\d+\]', unit_dir_name):
                    match = re.search(r'\[(\d+)\]', unit_dir_name)
                    if match:
                        orig_class_num = int(match.group(1))
                        class_name_or_list = class_aliases.get(str(orig_class_num))
                        if class_name_or_list:
                            class_name = class_name_or_list[-1] if isinstance(class_name_or_list, list) else class_name_or_list
                            for img_file in os.listdir(unit_path):
                                if Path(img_file).suffix.lower() in image_extensions:
                                    img_path = unit_path / img_file
                                    if img_path.is_file():
                                        relative_img_path = Path(base_dir) / unit_dir_name / img_file
                                        image_data.append({
                                            'split': 'natural',
                                            'class': class_name,
                                            'orig_class': class_name, # Assuming same for natural
                                            'orig_class_num': orig_class_num,
                                            'im_path': str(relative_img_path)
                                        })
                        else:
                            print(f"Warning: orig_class_num '{orig_class_num}' not found in class alias JSON for path: {unit_path}")


        elif base_dir in ['robust resnet50', 'vanilla resnet50']:
            for unit_dir_name in os.listdir(base_path):
                unit_path = base_path / unit_dir_name
                if unit_path.is_dir() and re.fullmatch(r'unit \[\d+\]', unit_dir_name):
                    match = re.search(r'\[(\d+)\]', unit_dir_name)
                    if match:
                        orig_class_num = int(match.group(1))
                        class_name_or_list = class_aliases.get(str(orig_class_num))
                        if class_name_or_list:
                            class_name = class_name_or_list[-1] if isinstance(class_name_or_list, list) else class_name_or_list
                            for leaf_dir_name in os.listdir(unit_path):
                                leaf_path = unit_path / leaf_dir_name
                                if leaf_path.is_dir():
                                    for img_file in os.listdir(leaf_path):
                                        if Path(img_file).suffix.lower() in image_extensions:
                                            img_path = leaf_path / img_file
                                            if img_path.is_file():
                                                relative_img_path = Path(base_dir) / unit_dir_name / leaf_dir_name / img_file
                                                split = f"{base_dir.replace(' ', '_')}-{leaf_dir_name.replace(' ', '_')}"
                                                image_data.append({
                                                    'split': split,
                                                    'class': class_name,
                                                    'orig_class': class_name, # Assuming same
                                                    'orig_class_num': orig_class_num,
                                                    'im_path': str(relative_img_path)
                                                })
                        else:
                            print(f"Warning: orig_class_num '{orig_class_num}' not found in class alias JSON for path: {unit_path}")

    df = pd.DataFrame(image_data)

    # Create class_num mapping
    unique_classes = sorted(df['class'].unique())
    class_to_num = {cls: i for i, cls in enumerate(unique_classes)}
    df['class_num'] = df['class'].map(class_to_num)

    # Define the desired column order
    column_order = ['split', 'class', 'class_num', 'orig_class', 'orig_class_num', 'im_path']
    df = df[column_order]

    # Sort the DataFrame
    df = df.sort_values(by=column_order)

    # Save the dirmap CSV
    df.to_csv(csv_path, index=False)
    print(f"\nDirmap CSV saved to: {csv_path}")

    # Print summary with all rows visible
    print("\nSummary of images per class and split:")
    with pd.option_context('display.max_rows', None, 'display.max_columns', None):
        summary = df.groupby(['split', 'class']).size().reset_index(name='count')
        print(summary)

if __name__ == "__main__":
    main()