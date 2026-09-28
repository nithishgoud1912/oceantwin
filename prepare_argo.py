"""Portable Argo converter. Specify a new --output path; original files stay intact."""
import sys
from ocean_analysis.ingest import main
if __name__ == '__main__': main(['argo', *sys.argv[1:]])
