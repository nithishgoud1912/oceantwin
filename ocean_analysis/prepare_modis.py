"""Prepare a time-resolved satellite grid with original coverage intervals."""
import sys
from ingest import main
if __name__ == '__main__': main(['modis', *sys.argv[1:]])
