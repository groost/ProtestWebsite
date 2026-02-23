import pandas as pd

candidates = pd.read_csv('candidates_enriched.csv')[['candidate_id', 'office']]

individual = pd.read_csv('individual_contributions.csv')
pac = pd.read_csv('pac_contributions.csv')

# Merge office info in
individual = individual.merge(candidates, on='candidate_id', how='left')
pac = pac.merge(candidates, on='candidate_id', how='left')

# Split and save by office
for office, label in [('H', 'house'), ('S', 'senate')]:
    ind_office = individual[individual['office'] == office].drop(columns='office')
    pac_office = pac[pac['office'] == office].drop(columns='office')

    ind_office.to_csv(f'individual_contributions_{label}.csv', index=False)
    pac_office.to_csv(f'pac_contributions_{label}.csv', index=False)

    print(f"{label.capitalize()}: {len(ind_office)} individual rows, {len(pac_office)} PAC rows")