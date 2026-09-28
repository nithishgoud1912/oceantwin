"""Portable glider converter. Requires --input and a new --output path."""
import sys
from ocean_analysis.ingest import main
if __name__ == '__main__': main(['glider', *sys.argv[1:]])
