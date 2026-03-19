######################################################################
## STEP 6: Decompose somatic mutations into COSMIC mutational signatures
## Mutational signatures = patterns of base substitutions that reflect
## the biological processes that generated those mutations.
## Examples:
##   SBS1  = clock-like deamination (age)
##   SBS4  = tobacco/smoking (C>A at GpCpX)
##   SBS7a/b = UV exposure (CC>TT dipyrimidines)
##   SBS3  = HR deficiency (BRCA1/2 mutations) — enriched in breast cancer
######################################################################

## Install: pip install SigProfilerExtractor
## Also install reference genome: python -c "from SigProfilerMatrixGenerator import install; install.install('GRCh38')"

from SigProfilerExtractor import sigpro as sig
from SigProfilerMatrixGenerator.scripts import SigProfilerMatrixGeneratorFunc as matGen
import pandas as pd
import matplotlib.pyplot as plt

## --- Step 6a: Generate the SBS96 mutation count matrix ---
## SBS96 = 96 trinucleotide context categories for single-base substitutions
## Each mutation is described by: REF base (with 5' and 3' context) + ALT base
## e.g. A[C>T]G = a C→T substitution where the 5' base is A and 3' base is G
path_to_vcf = "3_calls/"   # directory containing the PASS VCF file

## SigProfilerMatrixGenerator reads all VCFs in the directory
matGen.SigProfilerMatrixGeneratorFunc(
    "TCGA_BRCA",       # project name
    "GRCh38",          # genome assembly
    path_to_vcf,       # directory with VCF files
    plot=True,         # create spectrum plots
    exome=True         # restrict to exome (our data is WES)
)
## Output: SBS96 matrix in path_to_vcf/output/SBS/

## --- Step 6b: Extract de novo signatures ---
## SigProfilerExtractor decomposes the SBS96 matrix into N signatures
## by NMF (non-negative matrix factorization)
## Then compares to COSMIC reference signatures
sig.sigProfilerExtractor(
    input_type    = "matrix",       # input is an SBS96 matrix file
    output        = "5_signatures/",
    input_data    = "3_calls/output/SBS/TCGA_BRCA.SBS96.all",
    reference_genome = "GRCh38",
    minimum_signatures = 1,
    maximum_signatures = 5,        # test 1 to 5 de novo signatures
    nmf_replicates    = 100,       # 100 NMF runs for stability assessment
    cpu               = 4
)

## --- Step 6c: Read and plot signature contributions ---
## Load the decomposed signature proportions
sig_activities = pd.read_csv("5_signatures/SBS96/Suggested_Solution/COSMIC_SBS96_Activities/Activities_refit.txt",
                              sep="\t", index_col=0)

## Plot signature contributions as a stacked bar chart
ax = sig_activities.T.plot(kind="bar", stacked=True, figsize=(10, 5),
                            colormap="Set2")
ax.set_xlabel("Sample")
ax.set_ylabel("Number of mutations attributed to signature")
ax.set_title("Mutational signature decomposition (COSMIC SBS)")
ax.legend(bbox_to_anchor=(1.01, 1), loc="upper left", fontsize=8)
plt.tight_layout()
plt.savefig("5_signatures/signature_contributions.png", dpi=150)
print(sig_activities)