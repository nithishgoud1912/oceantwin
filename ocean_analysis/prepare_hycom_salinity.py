"""Portable salinity export; requires --input and --output."""
import sys
from ingest import main
if __name__ == '__main__': main(['grid', '--variable', 'salinity', *sys.argv[1:]])
