# 0. Install and load necessary packages
# install.packages(c("lme4", "car", "emmeans", "dplyr", "readr"))
library(lme4)
library(car)
library(emmeans)
library(dplyr)
library(readr)

# 1. Load Data
file_path <- "psych_data/df_main_6ani_6nonani_v2_1_cleaned.csv"
if (!dir.exists("psych_data")) {
  stop("Directory 'psych_data' not found. Please ensure it's in your working directory.")
}
if (!file.exists(file_path)) {
  stop(paste("File not found:", file_path, ". Please ensure it's in the 'psych_data' directory."))
}
df_exp <- read_csv(file_path, show_col_types = FALSE) # Added show_col_types = FALSE

# 2. Prepare Data
print("First few rows of the data:")
print(head(df_exp))
print("Structure of the data:")
str(df_exp)
print("Summary of 'perf' column:")
summary(df_exp$perf)
print("Unique values in 'split_recon':")
print(sort(unique(df_exp$split_recon)))

if(!is.numeric(df_exp$perf) || !all(df_exp$perf %in% c(0,1))) {
  stop("Column 'perf' must be numeric with values 0 or 1.")
}

df_exp$split_recon <- factor(df_exp$split_recon)
df_exp$participant <- factor(df_exp$participant)
df_exp$class <- factor(df_exp$class)

expected_levels <- c(
  'natural',
  'robust_resnet50-mXDREAM_-_l2robust',
  'robust_resnet50-Stretch_in_conv25',
  'robust_resnet50-Stretch_in_conv51',
  'robust_resnet50-Stretch_in_pixelspace',
  'vanilla_resnet50-mXDREAM_-_vanilla',
  'vanilla_resnet50-Stretch_in_conv25',
  'vanilla_resnet50-Stretch_in_conv51',
  'vanilla_resnet50-Stretch_in_pixelspace'
)
if(!all(sort(levels(df_exp$split_recon)) == sort(expected_levels))) {
  warning("Levels of 'split_recon' do not perfectly match the expected list. Check for typos or differences.")
  print("Actual levels found:")
  print(levels(df_exp$split_recon))
}

# 3. Fit GLMM
print("Fitting GLMM... This may take a few minutes.")
glmm_model <- glmer(perf ~ split_recon + (1 | participant) + (1 | class),
                    data = df_exp,
                    family = binomial(link = "logit"),
                    control = glmerControl(optCtrl = list(maxfun = 2e5)))

if(length(glmm_model@optinfo$conv$lme4$messages) > 0) {
  warning("Model convergence issues detected:")
  print(glmm_model@optinfo$conv$lme4$messages)
} else {
  print("Model converged successfully.")
}

print("GLMM Model Summary:")
summary(glmm_model)

# 4. Omnibus Test
print("Omnibus test for the effect of 'split_recon':")
omnibus_test <- Anova(glmm_model, type = "II")
print(omnibus_test)

# 5. Planned Contrasts/Pairwise Comparisons using `emmeans`
if (omnibus_test$`Pr(>Chisq)`[rownames(omnibus_test) == "split_recon"] < 0.05) {
  print("Omnibus test is significant. Proceeding with planned contrasts.")

  emm_split <- emmeans(glmm_model, specs = ~ split_recon)
  print("Estimated Marginal Means (on logit scale):")
  print(summary(emm_split))
  print("Estimated Marginal Means (on probability scale):")
  print(summary(emm_split, type = "response"))

  robust_mei    <- "robust_resnet50-mXDREAM_-_l2robust"
  robust_pixel  <- "robust_resnet50-Stretch_in_pixelspace"
  robust_c25    <- "robust_resnet50-Stretch_in_conv25"
  robust_c51    <- "robust_resnet50-Stretch_in_conv51"

  vanilla_mei   <- "vanilla_resnet50-mXDREAM_-_vanilla"
  vanilla_pixel <- "vanilla_resnet50-Stretch_in_pixelspace"
  vanilla_c25   <- "vanilla_resnet50-Stretch_in_conv25"
  vanilla_c51   <- "vanilla_resnet50-Stretch_in_conv51"

  all_levels_in_emm <- emm_split@levels$split_recon
  
  required_contrast_levels <- c(robust_mei, robust_pixel, robust_c25, robust_c51, vanilla_mei, vanilla_pixel, vanilla_c25, vanilla_c51)
  if(!all(required_contrast_levels %in% all_levels_in_emm)){
      print("DEBUG: required_contrast_levels that caused the error:")
      print(dput(required_contrast_levels[!required_contrast_levels %in% all_levels_in_emm]))
      print("DEBUG: All levels available in emmeans object (all_levels_in_emm):")
      print(dput(all_levels_in_emm))
      stop("One or more specified levels for contrasts are not found in the model's factor levels. Check spelling and data.")
  }

  full_contrast_avg_rob_vs_van <- setNames(numeric(length(all_levels_in_emm)), all_levels_in_emm)
  full_contrast_avg_rob_vs_van[c(robust_pixel, robust_c25, robust_c51)] <- 1/3
  full_contrast_avg_rob_vs_van[c(vanilla_pixel, vanilla_c25, vanilla_c51)] <- -1/3

  create_contrast_vector <- function(level1_name, level2_name, all_levels_vec) {
    if (!all(c(level1_name, level2_name) %in% all_levels_vec)) {
        stop(paste("Error in create_contrast_vector: One or both levels (", level1_name, ",", level2_name, ") not in all_levels_vec."))
    }
    cv <- rep(0, length(all_levels_vec))
    names(cv) <- all_levels_vec
    cv[level1_name] <- 1
    cv[level2_name] <- -1
    return(cv)
  }

  final_contrast_list <- list(
    AvgRobStr_vs_AvgVanStr = full_contrast_avg_rob_vs_van,
    Rob_c51_vs_Rob_c25     = create_contrast_vector(robust_c51, robust_c25, all_levels_in_emm),
    Van_c51_vs_Van_c25     = create_contrast_vector(vanilla_c51, vanilla_c25, all_levels_in_emm),
    Rob_c51_vs_Rob_Pixel   = create_contrast_vector(robust_c51, robust_pixel, all_levels_in_emm),
    Van_c51_vs_Van_Pixel   = create_contrast_vector(vanilla_c51, vanilla_pixel, all_levels_in_emm),
    Rob_c25_vs_Rob_Pixel   = create_contrast_vector(robust_c25, robust_pixel, all_levels_in_emm),
    Van_c25_vs_Van_Pixel   = create_contrast_vector(vanilla_c25, vanilla_pixel, all_levels_in_emm),
    Rob_mei_vs_Van_mei    = create_contrast_vector(robust_mei, vanilla_mei, all_levels_in_emm)
  )

  print("Planned Contrasts (8 comparisons):")
  planned_contrasts_summary <- summary(contrast(emm_split, method = final_contrast_list), adjust = "BH")
  print("Summary of Planned Contrasts (BH adjusted p-values):")
  print(planned_contrasts_summary)

  print("Follow-up exploratory analysis: ALL Pairwise Comparisons (BH adjusted p-values):")
  all_pairwise <- pairs(emmeans(glmm_model, specs= ~ split_recon), adjust = "BH")
  print(all_pairwise)

} else {
  print("Omnibus test is not significant (p >= 0.05). Planned contrasts are typically not performed or interpreted with caution.")
}

print("Analysis complete.")