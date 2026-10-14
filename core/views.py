
from django.shortcuts import render
from .forms import UploadFileForm

import json
import pandas as pd
from django.http import JsonResponse
from django.views.decorators.http import require_POST



def index(request):
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        
        if form.is_valid():
           
            uploaded_file = form.cleaned_data['file'] 
            
            return render(request, 'index.html', {
                'form': form,
                'file_name': uploaded_file.name,
                'message': "File uploaded successfully!"
            })
            
    else:
        form = UploadFileForm()
    
    return render(request, 'index.html', {'form': form})

# =====================================================
# DATALOOM PANDA ANALYSIS
# =====================================================



MAX_FILE_SIZE = 16 * 1024 * 1024


@require_POST
def analyze_dataset(request):

    uploaded_file = request.FILES.get("file")

    # -------------------------------------------------
    # CHECK FILE
    # -------------------------------------------------

    if not uploaded_file:
        return JsonResponse(
            {
                "error": "No file was uploaded."
            },
            status=400
        )


    # -------------------------------------------------
    # CHECK FILE SIZE
    # -------------------------------------------------

    if uploaded_file.size > MAX_FILE_SIZE:

        return JsonResponse(
            {
                "error": "This file is larger than 16 MB. Please choose a smaller file."
            },
            status=413
        )


    
    # CHECK FILE TYPE


    filename = uploaded_file.name.lower()

    if filename.endswith(".csv"):
        file_type = "csv"

    elif filename.endswith(".xlsx"):
        file_type = "xlsx"

    elif filename.endswith(".xls"):
        file_type = "xls"

    else:

        return JsonResponse(
            {
                "error": "Only CSV, XLS and XLSX files are supported."
            },
            status=400
        )


    
    # READ FILE WITH PANDAS
  

    try:

        if file_type == "csv":

            try:
                df = pd.read_csv(
                    uploaded_file,
                    encoding="utf-8-sig"
                )

            except UnicodeDecodeError:

                uploaded_file.seek(0)

                df = pd.read_csv(
                    uploaded_file,
                    encoding="latin1"
                )


        elif file_type == "xlsx":

            df = pd.read_excel(
                uploaded_file,
                engine="openpyxl"
            )


        else:

            df = pd.read_excel(
                uploaded_file,
                engine="xlrd"
            )


    except Exception as error:

        return JsonResponse(
            {
                "error": f"Could not read this file: {str(error)}"
            },
            status=400
        )


    
    # CHECK DATASET
    

    if df.empty:

        return JsonResponse(
            {
                "error": "The uploaded file contains no usable data."
            },
            status=400
        )


    # -------------------------------------------------
    # CLEAN EMPTY STRINGS
    # -------------------------------------------------

    df = df.replace(
        r"^\s*$",
        pd.NA,
        regex=True
    )


    # -------------------------------------------------
    # TRY TO DETECT DATE COLUMNS
    # -------------------------------------------------

    for column in df.columns:

        if pd.api.types.is_object_dtype(
            df[column]
        ):

            converted = pd.to_datetime(
                df[column],
                errors="coerce"
            )

            valid_ratio = (
                converted.notna().mean()
            )

            if valid_ratio >= 0.8:

                df[column] = converted


    
    headers = [
        str(column)
        for column in df.columns
    ]


    column_types = {}

    numeric_columns = []

    categorical_columns = []

    date_columns = []


    for column in df.columns:

        if pd.api.types.is_numeric_dtype(
            df[column]
        ):

            column_types[str(column)] = "numeric"

            numeric_columns.append(
                str(column)
            )


        elif pd.api.types.is_datetime64_any_dtype(
            df[column]
        ):

            column_types[str(column)] = "date"

            date_columns.append(
                str(column)
            )


        else:

            column_types[str(column)] = "categorical"

            categorical_columns.append(
                str(column)
            )


    
    # DATASET OVERVIEW
    

    total_rows = int(
        df.shape[0]
    )

    total_columns = int(
        df.shape[1]
    )


    total_missing = int(
        df.isna().sum().sum()
    )


    total_cells = (
        total_rows *
        total_columns
    )


    complete_cells = (
        total_cells -
        total_missing
    )


    complete_percent = (
        (
            complete_cells /
            total_cells
        ) * 100
        if total_cells
        else 0
    )


    missing_percent = (
        (
            total_missing /
            total_cells
        ) * 100
        if total_cells
        else 0
    )


    
    # MISSING VALUES PER COLUMN
    

    missing_by_column = {

        str(column):
            int(df[column].isna().sum())

        for column in df.columns

    }


    
    # NUMBER OF VISUALIZATIONS
    # Matches DataLoom's current chart rules
    

    chart_count = 0


    # Histogram for each numeric column

    chart_count += len(
        numeric_columns
    )


    # Scatter plot

    if len(numeric_columns) >= 2:

        chart_count += 1


    # Box plot

    if (
        len(numeric_columns) >= 1
        and
        len(categorical_columns) >= 1
    ):

        chart_count += 1


    # Pie / count plots

    for column in categorical_columns:

        unique_count = int(
            df[column]
            .dropna()
            .nunique()
        )

        if unique_count <= 8:

            chart_count += 1

        else:

            chart_count += 1


    # Treemap + Sunburst

    if len(categorical_columns) >= 2:

        chart_count += 2


    # Line chart

    if (
        len(date_columns) >= 1
        and
        len(numeric_columns) >= 1
    ):

        chart_count += 1


    
    # PREVIEW
    

    preview = json.loads(
        df.head(8).to_json(
            orient="records",
            date_format="iso"
        )
    )


    # -------------------------------------------------
    # DATA FOR VISUALIZATIONS
    #
    # This lets the existing JavaScript charts
    # continue working with the Pandas result.
    # -------------------------------------------------

    records = json.loads(
        df.to_json(
            orient="records",
            date_format="iso"
        )
    )


    
    # RETURN RESULTS
    

    return JsonResponse(
        {
            "success": True,

            "filename": uploaded_file.name,

            "headers": headers,

            "column_types": column_types,

            "numeric_columns": numeric_columns,

            "categorical_columns": categorical_columns,

            "date_columns": date_columns,

            "total_rows": total_rows,

            "total_columns": total_columns,

            "total_missing": total_missing,

            "complete_cells": complete_cells,

            "complete_percent": round(
                complete_percent,
                1
            ),

            "missing_percent": round(
                missing_percent,
                1
            ),

            "missing_by_column":
                missing_by_column,

            "chart_count":
                chart_count,

            "preview":
                preview,

            "data":
                records,
        }
    )