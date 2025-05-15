# 0. Install and load necessary packages
# install.packages(c("lme4", "car", "emmeans", "dplyr", "readr", "ggplot2"))
library(lme4)
library(car)
library(emmeans)
library(dplyr)
library(readr)
library(ggplot2)

# 1. Load Data
file_path <- "psych_data/AlexNet_Accuracy_single_answers.csv"
if (!dir.exists("psych_data")) {
  stop("Directory 'psych_data' not found. Please ensure it's in your working directory.")
}
if (!file.exists(file_path)) {
  stop(paste("File not found:", file_path, ". Please ensure it's in the 'psych_data' directory."))
}
df_alexnet <- read_csv(file_path, show_col_types = FALSE)

# 2. Prepare Data
print("First few rows of the data:")
print(head(df_alexnet))
print("Structure of the data:")
str(df_alexnet)
print("Summary of 'ans' column:")
summary(df_alexnet$ans)
print("Unique values in 'exp_type':")
print(sort(unique(df_alexnet$exp_type)))

if(!is.numeric(df_alexnet$ans) || !all(df_alexnet$ans %in% c(0,1))) {
  stop("Column 'ans' must be numeric with values 0 or 1.")
}

# Calculate accuracy per exp_type to understand data better
acc_by_type <- df_alexnet %>% 
  group_by(exp_type) %>% 
  summarize(accuracy = mean(ans), n = n())
print("Accuracy by exp_type:")
print(acc_by_type)

df_alexnet$exp_type <- factor(df_alexnet$exp_type)
df_alexnet$cat <- factor(df_alexnet$cat)

# Get expected levels from the data
expected_levels <- sort(unique(df_alexnet$exp_type))
print("Expected levels of 'exp_type':")
print(expected_levels)

# 3. Fit GLMM with more robust convergence options
# Note: We're excluding "Natural" since it has perfect accuracy (100%), which causes convergence issues
print("Fitting GLMM with robust convergence options...")

# First try with all data, but more robust optimization
glmm_model <- glmer(ans ~ exp_type + (1 | cat),
                   data = df_alexnet,
                   family = binomial(link = "logit"),
                   control = glmerControl(optimizer = "bobyqa", 
                                         optCtrl = list(maxfun = 2e5)))

if(length(glmm_model@optinfo$conv$lme4$messages) > 0) {
  warning("Model convergence issues detected with full data. Trying without perfect accuracy conditions...")
  
  # Check if we have any conditions with perfect accuracy (100%)
  perfect_acc_types <- acc_by_type %>% 
    filter(accuracy == 1) %>% 
    pull(exp_type)
  
  if(length(perfect_acc_types) > 0) {
    print(paste("Removing condition(s) with perfect accuracy:", paste(perfect_acc_types, collapse=", ")))
    
    # Filter out conditions with perfect accuracy
    df_alexnet_subset <- df_alexnet %>% 
      filter(!(exp_type %in% perfect_acc_types))
    
    # Refit model with filtered data
    glmm_model <- glmer(ans ~ exp_type + (1 | cat),
                       data = df_alexnet_subset,
                       family = binomial(link = "logit"),
                       control = glmerControl(optimizer = "bobyqa", 
                                             optCtrl = list(maxfun = 2e5)))
  }
}

if(length(glmm_model@optinfo$conv$lme4$messages) > 0) {
  warning("Model convergence issues still detected.")
  print(glmm_model@optinfo$conv$lme4$messages)
} else {
  print("Model converged successfully.")
}

print("GLMM Model Summary:")
print(summary(glmm_model))

# 4. Omnibus Test
print("Omnibus test for the effect of 'exp_type':")
omnibus_test <- Anova(glmm_model, type = "II")
print(omnibus_test)

# 5. Planned Contrasts/Pairwise Comparisons using `emmeans`
if (omnibus_test$`Pr(>Chisq)`[rownames(omnibus_test) == "exp_type"] < 0.05) {
  print("Omnibus test is significant. Proceeding with planned contrasts.")

  emm_split <- emmeans(glmm_model, specs = ~ exp_type)
  print("Estimated Marginal Means (on logit scale):")
  print(summary(emm_split))
  print("Estimated Marginal Means (on probability scale):")
  emm_prob <- summary(emm_split, type = "response")
  print(emm_prob)

  # Define the levels for contrasts based on our dataset
  # Note: Natural may be excluded due to perfect accuracy
  robust_mei     <- "Robust MEI"
  robust_pixel   <- "Robust Pixel space"
  robust_layer3  <- "Robust Layer3_conv1"
  robust_layer4  <- "Robust Layer4_conv7"
  
  standard_mei   <- "Standard MEI"
  standard_pixel <- "Standard Pixel space"
  standard_layer3 <- "Standard Layer3_conv1"
  standard_layer4 <- "Standard Layer4_conv7"

  all_levels_in_emm <- emm_split@levels$exp_type
  
  # Create a contrast for robust vs standard (averaging across pixel space, layer3, layer4)
  # Only include contrasts for levels that are present in the model
  create_contrast_vector <- function(level1_name, level2_name, all_levels_vec) {
    if (!all(c(level1_name, level2_name) %in% all_levels_vec)) {
      warning(paste("Skipping contrast", level1_name, "vs", level2_name, "- one or both levels not available in model"))
      return(NULL)
    }
    cv <- rep(0, length(all_levels_vec))
    names(cv) <- all_levels_vec
    cv[level1_name] <- 1
    cv[level2_name] <- -1
    return(cv)
  }

  # Define the planned contrasts only using available levels
  final_contrast_list <- list()
  
  # Add robust vs standard average contrast if all necessary levels are present
  if (all(c(robust_pixel, robust_layer3, robust_layer4, 
             standard_pixel, standard_layer3, standard_layer4) %in% all_levels_in_emm)) {
    full_contrast_avg_rob_vs_std <- setNames(numeric(length(all_levels_in_emm)), all_levels_in_emm)
    full_contrast_avg_rob_vs_std[c(robust_pixel, robust_layer3, robust_layer4)] <- 1/3
    full_contrast_avg_rob_vs_std[c(standard_pixel, standard_layer3, standard_layer4)] <- -1/3
    final_contrast_list[["AvgRob_vs_AvgStd"]] <- full_contrast_avg_rob_vs_std
  }
  
  # Add each pairwise contrast if both levels are present
  contrasts_to_add <- list(
    Rob_layer4_vs_Rob_layer3 = c(robust_layer4, robust_layer3),
    Std_layer4_vs_Std_layer3 = c(standard_layer4, standard_layer3),
    Rob_layer4_vs_Rob_Pixel = c(robust_layer4, robust_pixel),
    Std_layer4_vs_Std_Pixel = c(standard_layer4, standard_pixel),
    Rob_layer3_vs_Rob_Pixel = c(robust_layer3, robust_pixel),
    Std_layer3_vs_Std_Pixel = c(standard_layer3, standard_pixel),
    Rob_mei_vs_Std_mei = c(robust_mei, standard_mei)
  )
  
  for (contrast_name in names(contrasts_to_add)) {
    levels_pair <- contrasts_to_add[[contrast_name]]
    contrast_vector <- create_contrast_vector(levels_pair[1], levels_pair[2], all_levels_in_emm)
    if (!is.null(contrast_vector)) {
      final_contrast_list[[contrast_name]] <- contrast_vector
    }
  }

  if (length(final_contrast_list) > 0) {
    print(paste("Running", length(final_contrast_list), "planned contrasts:"))
    planned_contrasts_summary <- summary(contrast(emm_split, method = final_contrast_list), adjust = "BH")
    print("Summary of Planned Contrasts (BH adjusted p-values):")
    print(planned_contrasts_summary)
  } else {
    print("No valid planned contrasts could be created with available levels.")
  }

  print("Follow-up exploratory analysis: ALL Pairwise Comparisons (BH adjusted p-values):")
  all_pairwise <- pairs(emmeans(glmm_model, specs= ~ exp_type), adjust = "BH")
  print(all_pairwise)

} else {
  print("Omnibus test is not significant (p >= 0.05). Planned contrasts are typically not performed or interpreted with caution.")
}

print("Analysis complete.") 