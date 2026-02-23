import pandas as pd

df = pd.read_csv('individual_contributions.csv')

combined = df.groupby(['candidate_id', 'candidate_name', 'contributor_name', 'city', 'state', 'employer', 'occupation']).agg(
    total_amount=('amount', 'sum'),
    num_contributions=('amount', 'count')
).reset_index()

combined.to_csv('individual_contributions_combined.csv', index=False)
print(f"Reduced from {len(df)} rows to {len(combined)} rows")