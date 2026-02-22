import pandas as pd


def normalize_name(name: str) -> str:
    """Normalize candidate names for matching.
    
    Converts enriched file's 'LAST, FIRST' format to 'FIRST LAST'
    so it can be matched against the websites file's 'First Last' format.
    """
    name = str(name).strip().upper()
    if "," in name:
        last, first = name.split(",", 1)
        name = f"{first.strip()} {last.strip()}"
    return name


def merge_candidate_websites(
    enriched_path: str = "candidates_enriched.csv",
    websites_path: str = "candidates_websites.csv",
    output_path: str = "candidates_enriched_with_websites.csv",
) -> pd.DataFrame:
    # Load data
    enriched = pd.read_csv(enriched_path)
    websites = pd.read_csv(websites_path)

    # Normalize names for joining
    enriched["_name_key"] = enriched["candidate_name"].apply(normalize_name)
    websites["_name_key"] = websites["name"].apply(lambda x: str(x).strip().upper())

    # Select website columns to merge in
    website_cols = ["_name_key", "campaign_website", "twitter", "facebook", "instagram", "profile_url"]
    merged = enriched.merge(websites[website_cols], on="_name_key", how="left")
    merged.drop(columns=["_name_key"], inplace=True)

    # Save output
    merged.to_csv(output_path, index=False)

    matched = merged["campaign_website"].notna().sum()
    print(f"Rows in output:    {len(merged)}")
    print(f"Candidates matched: {matched} / {len(enriched)}")
    print(f"Saved to:           {output_path}")

    return merged


if __name__ == "__main__":
    merge_candidate_websites(
        enriched_path="candidates_enriched.csv",
        websites_path="candidates_websites.csv",
        output_path="candidates_enriched_with_websites.csv",
    )
