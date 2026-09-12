from huggingface_hub import hf_hub_download
import pandas as pd

print("Downloading BigEarthNet.txt metadata...")

path = hf_hub_download(
    repo_id="BIFOLD-BigEarthNetv2-0/BigEarthNet.txt",
    filename="BigEarthNet.txt.parquet",
    repo_type="dataset",
)

print("\nMetadata downloaded to:")
print(path)

# Read metadata
df = pd.read_parquet(path)

print("\nDataset shape:")
print(df.shape)

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 2 rows:")
print(df.head(2).T)

# Select 50 samples
sample = df.sample(
    50,
    random_state=42
)

sample.to_csv(
    "data/bigearthnet_text_sample.csv",
    index=False
)

print("\nSelected samples:")
print(
    sample[
        ["ID", "patch_id", "s1_name", "country", "input", "output"]
    ]
)

print("\nSaved to:")
print("data/bigearthnet_sample.csv")