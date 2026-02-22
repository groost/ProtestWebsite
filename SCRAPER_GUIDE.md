
# Ballotpedia Campaign Website Scraper - Production Guide

## How This Works

This automated scraper collects campaign websites from Ballotpedia for 2026 midterm candidates.

### Method 1: Web Scraping (Requires Network Access)

The script fetches Ballotpedia pages and extracts:
- Candidate names
- States and districts  
- Party affiliations
- Campaign website URLs
- Incumbent status
- Social media links

### Method 2: API-Assisted Extraction (Recommended)

Uses Claude API to intelligently parse HTML and extract structured data.
More reliable than traditional CSS selectors.

## Setup Instructions

### 1. Install Dependencies

```bash
pip install beautifulsoup4 requests
```

### 2. For API Method (Optional)

Set your Anthropic API key:
```bash
```

### 3. Run the Scraper

```bash
# Demo mode (first 20 candidates)
python ballotpedia_scraper.py

# All candidates
python ballotpedia_scraper.py --full

# Specific state
python ballotpedia_scraper.py --state California

# Multiple states
python ballotpedia_scraper.py --states "California,Texas,New York"
```

## Output Files

### CSV Format (candidates_2026.csv)
Spreadsheet-friendly format with columns:
- name
- state  
- office
- party
- campaign_website
- incumbent
- profile_url

### JSON Format (candidates_2026.json)
Structured data for programmatic use

## Usage Tips

1. **Rate Limiting**: Script includes 1-second delays between requests
   to be respectful to Ballotpedia's servers

2. **Incremental Updates**: Run weekly to catch new candidate filings

3. **Data Quality**: Not all candidates will have websites, especially
   those who just filed

4. **Primary Candidates**: Script captures ALL declared candidates,
   including primary challengers

## Advanced Usage

### Filtering Results

```python
# Filter for specific party
democrats = [c for c in candidates if c['party'] == 'Democratic']

# Filter for incumbents only
incumbents = [c for c in candidates if c['incumbent']]

# Filter by state
california = [c for c in candidates if c['state'] == 'California']
```

### Export to Google Sheets

```python
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# Authenticate and upload
gc = gspread.authorize(credentials)
sheet = gc.open('2026 Candidates').sheet1
sheet.update([candidates])
```

## Ethical Considerations

- This data is publicly available on Ballotpedia
- Respect rate limits (1 second between requests)
- Don't use for spam or harassment
- Verify information before use in research/journalism

## Maintenance

Ballotpedia may update their HTML structure. If the scraper stops working:

1. Check the Ballotpedia page structure hasn't changed
2. Update CSS selectors in `parse_candidate_info()`
3. Test on a small sample first

## Support

For issues or questions:
- Check Ballotpedia's documentation
- Review the script's comments
- Test with `--debug` flag for verbose output
