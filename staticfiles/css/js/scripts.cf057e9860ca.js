/* =====================================================
   DATALOOM
   ONE CONTROLLER FOR:

   FILE SELECTION
   DJANGO UPLOAD
   PANDAS ANALYSIS
   DASHBOARD
   CHARTS
===================================================== */


/* =====================================================
   APPLICATION STATE
===================================================== */

const state = {
    file: null,
    data: [],
    headers: [],
    columnTypes: {},
    charts: []
};


/* =====================================================
   HTML ELEMENTS
===================================================== */

const uploadForm =
    document.getElementById("uploadForm");

const fileInput =
    document.getElementById("fileInput");

const dropZone =
    document.getElementById("dropZone");

const selectedFileBox =
    document.getElementById("selectedFile");

const fileName =
    document.getElementById("fileName");

const fileSize =
    document.getElementById("fileSize");

const analyzeButton =
    document.getElementById("analyzeButton");

const uploadMessage =
    document.getElementById("uploadMessage");


/* =====================================================
   STARTUP
===================================================== */

console.log("DataLoom script loaded successfully.");


/* =====================================================
   FILE SELECTION
===================================================== */

if (fileInput) {

    fileInput.addEventListener("change", function () {

        const file = this.files && this.files[0];

        if (!file) {
            return;
        }

        handleFile(file);
    });

}


/* =====================================================
   DRAG AND DROP
===================================================== */

if (dropZone) {

    dropZone.addEventListener("dragover", function (event) {

        event.preventDefault();

        dropZone.classList.add("dragging");

    });


    dropZone.addEventListener("dragleave", function () {

        dropZone.classList.remove("dragging");

    });


    dropZone.addEventListener("drop", function (event) {

        event.preventDefault();

        dropZone.classList.remove("dragging");

        const file =
            event.dataTransfer.files &&
            event.dataTransfer.files[0];

        if (file) {
            handleFile(file);
        }

    });

}


/* =====================================================
   FILE HANDLER
===================================================== */

function handleFile(file) {

    const MAX_SIZE =
        16 * 1024 * 1024;


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const allowed =
        ["csv", "xls", "xlsx"];


    if (!allowed.includes(extension)) {

        showMessage(
            "Please choose a CSV, XLS, or XLSX file.",
            "error"
        );

        resetFile();

        return;
    }


    if (file.size > MAX_SIZE) {

        showMessage(
            "This file is larger than 16 MB.",
            "error"
        );

        resetFile();

        return;
    }


    state.file = file;


    /* File name */

    if (fileName) {
        fileName.textContent =
            file.name;
    }


    /* File size */

    if (fileSize) {
        fileSize.textContent =
            formatFileSize(file.size);
    }


    /* Selected file card */

    if (selectedFileBox) {

        selectedFileBox.style.display =
            "flex";

        selectedFileBox.classList.add(
            "show"
        );
    }


    /* Analyze button */

    if (analyzeButton) {

        analyzeButton.style.display =
            "inline-flex";

        analyzeButton.classList.add(
            "show"
        );

        analyzeButton.disabled =
            false;

        analyzeButton.innerHTML =
            'Analyze Dataset <span>→</span>';
    }


    showMessage(
        "File selected successfully: " +
        file.name,
        "success"
    );


    console.log(
        "Selected file:",
        file.name
    );

}


/* =====================================================
   FILE SIZE
===================================================== */

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return bytes + " Bytes";

    }


    if (bytes < 1024 * 1024) {

        return (
            bytes / 1024
        ).toFixed(1) + " KB";

    }


    return (
        bytes / (1024 * 1024)
    ).toFixed(1) + " MB";
}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(message, type) {

    if (!uploadMessage) {
        return;
    }

    uploadMessage.textContent =
        message;

    uploadMessage.className =
        "upload-message " + type;
}


/* =====================================================
   RESET FILE
===================================================== */

function resetFile() {

    state.file = null;

    if (fileInput) {
        fileInput.value = "";
    }

    if (selectedFileBox) {

        selectedFileBox.style.display =
            "none";

        selectedFileBox.classList.remove(
            "show"
        );
    }

    if (analyzeButton) {

        analyzeButton.style.display =
            "none";

        analyzeButton.classList.remove(
            "show"
        );

        analyzeButton.disabled =
            false;
    }
}


/* =====================================================
   FORM SUBMISSION
===================================================== */

if (uploadForm) {

    uploadForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            analyzeWithPandas();

        }
    );

}


/* =====================================================
   SEND FILE TO DJANGO + PANDAS
===================================================== */

async function analyzeWithPandas() {

    const file =
        state.file ||
        (fileInput &&
         fileInput.files &&
         fileInput.files[0]);


    if (!file) {

        showMessage(
            "Please select a dataset first.",
            "error"
        );

        return;
    }


    if (analyzeButton) {

        analyzeButton.disabled =
            true;

        analyzeButton.innerHTML =
            'Analyzing with Pandas... <span>⏳</span>';
    }


    showMessage(
        "Uploading and analyzing your dataset...",
        "loading"
    );


    updateElement(
        "datasetStatus",
        "Analyzing with Pandas..."
    );


    try {

        const formData =
            new FormData(uploadForm);


        const response =
            await fetch(
                "/analyze/",
                {
                    method: "POST",
                    body: formData,
                    headers: {
                        "X-Requested-With":
                            "XMLHttpRequest"
                    }
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "The server could not analyze this file."
            );
        }


        if (!result.success) {

            throw new Error(
                result.error ||
                "Analysis failed."
            );
        }


        console.log(
            "Pandas result received:",
            result
        );


        /* =================================================
           STORE PANDAS RESULT
        ================================================= */

        state.data =
            result.data || [];

        state.headers =
            result.headers || [];

        state.columnTypes =
            result.column_types || {};


        /* =================================================
           OVERVIEW
        ================================================= */

        updateElement(
            "totalRows",
            result.total_rows
        );

        updateElement(
            "totalColumns",
            result.total_columns
        );

        updateElement(
            "totalMissing",
            result.total_missing
        );

        updateElement(
            "numericColumns",
            result.numeric_columns.length
        );


        /* =================================================
           QUALITY
        ================================================= */

        updateElement(
            "completePercent",
            result.complete_percent + "%"
        );

        updateElement(
            "completeCells",
            result.complete_cells
        );

        updateElement(
            "missingPercent",
            result.missing_percent + "%"
        );

        updateElement(
            "missingCellsBottom",
            result.total_missing
        );


        const completeBar =
            document.getElementById(
                "completeBar"
            );

        if (completeBar) {

            completeBar.style.width =
                result.complete_percent + "%";
        }


        const missingBar =
            document.getElementById(
                "missingBar"
            );

        if (missingBar) {

            missingBar.style.width =
                result.missing_percent + "%";
        }


        /* =================================================
           COLUMN TYPES
        ================================================= */

        renderColumnTypes();


        /* =================================================
           MISSING VALUES
        ================================================= */

        renderMissingValues(
            result.missing_by_column,
            result.total_rows
        );


        /* =================================================
           PREVIEW
        ================================================= */

        renderPreview(
            result.preview
        );


        /* =================================================
           VISUALIZATIONS
        ================================================= */

        generateCharts();


        /* =================================================
           STATUS
        ================================================= */

        updateElement(
            "datasetStatus",
            "Dataset analyzed with Pandas"
        );


        updateElement(
            "chartCount",
            state.charts.length
        );


        showMessage(
            "File analyzed successfully with Pandas.",
            "success"
        );


        resetAnalyzeButton();


        /* Scroll to analysis */

        const analysis =
            document.getElementById(
                "analysis"
            );

        if (analysis) {

            analysis.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    }

    catch (error) {

        console.error(
            "DataLoom error:",
            error
        );


        updateElement(
            "datasetStatus",
            "Analysis failed"
        );


        showMessage(
            error.message ||
            "Something went wrong while analyzing the file.",
            "error"
        );


        resetAnalyzeButton();
    }

}


/* =====================================================
   RESET ANALYZE BUTTON
===================================================== */

function resetAnalyzeButton() {

    if (!analyzeButton) {
        return;
    }

    analyzeButton.disabled =
        false;

    analyzeButton.style.display =
        "inline-flex";

    analyzeButton.classList.add(
        "show"
    );

    analyzeButton.innerHTML =
        'Analyze Dataset <span>→</span>';
}


/* =====================================================
   COLUMN TYPES
===================================================== */

function renderColumnTypes() {

    const container =
        document.getElementById(
            "columnTypes"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    state.headers.forEach(
        function (column) {

            const type =
                state.columnTypes[column] ||
                "unknown";


            const badge =
                document.createElement(
                    "span"
                );


            badge.className =
                "type-badge " + type;


            badge.textContent =
                column + ": " + type;


            container.appendChild(
                badge
            );

        }
    );

}


/* =====================================================
   MISSING VALUES
===================================================== */

function renderMissingValues(
    missingByColumn,
    totalRows
) {

    const container =
        document.getElementById(
            "missingList"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    let hasMissing =
        false;


    state.headers.forEach(
        function (column) {

            const missing =
                Number(
                    missingByColumn[column] || 0
                );


            if (missing > 0) {
                hasMissing = true;
            }


            const percentage =
                totalRows > 0
                    ? (
                        missing /
                        totalRows
                    ) * 100
                    : 0;


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "missing-row";


            row.innerHTML = `
                <div>

                    <div class="missing-name">
                        ${escapeHtml(column)}
                    </div>

                    <div class="mini-progress">

                        <div
                            style="width:${percentage}%"
                        ></div>

                    </div>

                </div>

                <div class="missing-number">
                    ${missing} cells
                </div>

                <div class="missing-number">
                    ${percentage.toFixed(1)}%
                </div>
            `;


            container.appendChild(
                row
            );

        }
    );


    if (!hasMissing) {

        container.innerHTML = `
            <div class="empty-state">
                No missing values were detected.
            </div>
        `;

    }

}


/* =====================================================
   PREVIEW
===================================================== */

function renderPreview(preview) {

    const tableHead =
        document.getElementById(
            "tableHead"
        );

    const tableBody =
        document.getElementById(
            "tableBody"
        );


    if (
        !tableHead ||
        !tableBody
    ) {
        return;
    }


    tableHead.innerHTML =
        "";

    tableBody.innerHTML =
        "";


    /* Header */

    const headerRow =
        document.createElement(
            "tr"
        );


    state.headers.forEach(
        function (column) {

            const th =
                document.createElement(
                    "th"
                );


            th.textContent =
                column;


            headerRow.appendChild(
                th
            );

        }
    );


    tableHead.appendChild(
        headerRow
    );


    /* Rows */

    preview.forEach(
        function (row) {

            const tr =
                document.createElement(
                    "tr"
                );


            state.headers.forEach(
                function (column) {

                    const td =
                        document.createElement(
                            "td"
                        );


                    td.textContent =
                        row[column] ?? "";


                    tr.appendChild(
                        td
                    );

                }
            );


            tableBody.appendChild(
                tr
            );

        }
    );


    updateElement(
        "previewInfo",
        `First ${preview.length} rows`
    );

}


/* =====================================================
   GENERATE CHARTS
===================================================== */

function generateCharts() {

    clearCharts();


    const numeric =
        state.headers.filter(
            function (column) {

                return (
                    state.columnTypes[column] ===
                    "numeric"
                );

            }
        );


    const categorical =
        state.headers.filter(
            function (column) {

                return (
                    state.columnTypes[column] ===
                    "categorical"
                );

            }
        );


    const dates =
        state.headers.filter(
            function (column) {

                return (
                    state.columnTypes[column] ===
                    "date"
                );

            }
        );


    console.log(
        "Numeric:",
        numeric
    );

    console.log(
        "Categorical:",
        categorical
    );

    console.log(
        "Date:",
        dates
    );


    /* Histogram */

    numeric.forEach(
        function (column) {

            createHistogram(
                column
            );

        }
    );


    /* Scatter */

    if (numeric.length >= 2) {

        createScatter(
            numeric[0],
            numeric[1]
        );

    }


    /* Box */

    if (
        numeric.length >= 1 &&
        categorical.length >= 1
    ) {

        createBoxPlot(
            numeric[0],
            categorical[0]
        );

    }


    /* Pie / Count */

    categorical.forEach(
        function (column) {

            const unique =
                getUniqueValues(
                    column
                ).length;


            if (unique <= 8) {

                createPie(
                    column
                );

            } else {

                createCount(
                    column
                );

            }

        }
    );


    /* Treemap + Sunburst */

    if (categorical.length >= 2) {

        createTreemap(
            categorical[0],
            categorical[1]
        );


        createSunburst(
            categorical[0],
            categorical[1]
        );

    }


    /* Line */

    if (
        dates.length >= 1 &&
        numeric.length >= 1
    ) {

        createLine(
            dates[0],
            numeric[0]
        );

    }


    updateElement(
        "chartCount",
        state.charts.length
    );


    console.log(
        "Charts generated:",
        state.charts.length
    );

}


/* =====================================================
   CLEAR CHARTS
===================================================== */

function clearCharts() {

    state.charts.forEach(
        function (chart) {

            try {

                if (
                    chart &&
                    chart.kind ===
                    "plotly"
                ) {

                    if (
                        typeof Plotly !==
                        "undefined"
                    ) {

                        Plotly.purge(
                            chart.element
                        );

                    }

                }

                else if (
                    chart &&
                    typeof chart.destroy ===
                    "function"
                ) {

                    chart.destroy();

                }

            }

            catch (error) {

                console.warn(
                    "Chart cleanup:",
                    error
                );

            }

        }
    );


    state.charts.length =
        0;


    const grid =
        document.getElementById(
            "chartsGrid"
        );


    if (grid) {

        grid.innerHTML =
            "";

    }

}


/* =====================================================
   CHART CARD
===================================================== */

function createChartCard(
    title,
    description
) {

    const grid =
        document.getElementById(
            "chartsGrid"
        );


    if (!grid) {
        return null;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "chart-card";


    card.innerHTML = `
        <div class="chart-header">

            <div>

                <h3>
                    ${escapeHtml(title)}
                </h3>

                <p>
                    ${escapeHtml(description)}
                </p>

            </div>

            <span class="chart-badge">
                AUTO
            </span>

        </div>
    `;


    grid.appendChild(
        card
    );


    return card;

}


/* =====================================================
   CANVAS CARD
===================================================== */

function createCanvasCard(
    title,
    description
) {

    const card =
        createChartCard(
            title,
            description
        );


    if (!card) {
        return null;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "chart-container";


    const canvas =
        document.createElement(
            "canvas"
        );


    wrapper.appendChild(
        canvas
    );


    card.appendChild(
        wrapper
    );


    return canvas;

}


/* =====================================================
   HISTOGRAM
===================================================== */

function createHistogram(column) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;
    }


    const canvas =
        createCanvasCard(
            `Histogram — ${column}`,
            "Distribution of numeric values"
        );


    if (!canvas) {
        return;
    }


    const values =
        getNumericValues(
            column
        );


    if (!values.length) {
        return;
    }


    const min =
        Math.min(...values);

    const max =
        Math.max(...values);


    const binsCount =
        10;


    const step =
        max === min
            ? 1
            : (max - min) /
              binsCount;


    const bins =
        new Array(
            binsCount
        ).fill(0);


    values.forEach(
        function (value) {

            let index =
                Math.floor(
                    (value - min) /
                    step
                );


            if (
                index >= binsCount
            ) {

                index =
                    binsCount - 1;

            }


            bins[index]++;

        }
    );


    const labels =
        bins.map(
            function (_, index) {

                return (
                    min +
                    index *
                    step
                ).toFixed(1);

            }
        );


    const chart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels:
                        labels,

                    datasets: [

                        {
                            label:
                                column,

                            data:
                                bins
                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );


    state.charts.push(
        chart
    );

}


/* =====================================================
   SCATTER
===================================================== */

function createScatter(
    xColumn,
    yColumn
) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        return;
    }


    const canvas =
        createCanvasCard(
            `Scatter Plot — ${xColumn} vs ${yColumn}`,
            "Relationship between two numeric columns"
        );


    if (!canvas) {
        return;
    }


    const points =
        state.data
            .filter(
                function (row) {

                    return (
                        isNumeric(
                            row[xColumn]
                        ) &&
                        isNumeric(
                            row[yColumn]
                        )
                    );

                }
            )
            .map(
                function (row) {

                    return {

                        x:
                            Number(
                                row[xColumn]
                            ),

                        y:
                            Number(
                                row[yColumn]
                            )

                    };

                }
            );


    const chart =
        new Chart(
            canvas,
            {

                type:
                    "scatter",

                data: {

                    datasets: [

                        {

                            label:
                                xColumn +
                                " vs " +
                                yColumn,

                            data:
                                points

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );


    state.charts.push(
        chart
    );

}


/* =====================================================
   BOX PLOT
===================================================== */

function createBoxPlot(
    numericColumn,
    categoryColumn
) {

    if (
        typeof Plotly ===
        "undefined"
    ) {

        console.error(
            "Plotly is not loaded."
        );

        return;
    }


    const card =
        createChartCard(
            `Box Plot — ${numericColumn} by ${categoryColumn}`,
            "Numeric distribution grouped by category"
        );


    if (!card) {
        return;
    }


    const plot =
        document.createElement(
            "div"
        );


    plot.className =
        "plotly-container";


    card.appendChild(
        plot
    );


    const groups = {};


    state.data.forEach(
        function (row) {

            const category =
                String(
                    row[categoryColumn] ??
                    "Unknown"
                );


            const value =
                Number(
                    row[numericColumn]
                );


            if (!Number.isNaN(value)) {

                if (
                    !groups[category]
                ) {

                    groups[category] =
                        [];

                }


                groups[category].push(
                    value
                );

            }

        }
    );


    const traces =
        Object.keys(groups).map(
            function (category) {

                return {

                    y:
                        groups[category],

                    type:
                        "box",

                    name:
                        category,

                    boxpoints:
                        "outliers"

                };

            }
        );


    if (!traces.length) {
        return;
    }


    Plotly.newPlot(
        plot,
        traces,
        {
            margin: {
                t: 10,
                l: 45,
                r: 15,
                b: 45
            }
        },
        {
            responsive: true,
            displayModeBar: false
        }
    );


    state.charts.push({
        kind: "plotly",
        element: plot
    });

}


/* =====================================================
   PIE
===================================================== */

function createPie(column) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        return;
    }


    const canvas =
        createCanvasCard(
            `Pie Chart — ${column}`,
            "Category distribution"
        );


    if (!canvas) {
        return;
    }


    const counts =
        getValueCounts(
            column
        );


    const chart =
        new Chart(
            canvas,
            {

                type:
                    "pie",

                data: {

                    labels:
                        Object.keys(
                            counts
                        ),

                    datasets: [

                        {

                            label:
                                column,

                            data:
                                Object.values(
                                    counts
                                )

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );


    state.charts.push(
        chart
    );

}


/* =====================================================
   COUNT PLOT
===================================================== */

function createCount(column) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        return;
    }


    const canvas =
        createCanvasCard(
            `Count Plot — ${column}`,
            "Top 10 most common categories"
        );


    if (!canvas) {
        return;
    }


    const sorted =
        Object.entries(
            getValueCounts(
                column
            )
        )
        .sort(
            function (a, b) {

                return b[1] - a[1];

            }
        )
        .slice(
            0,
            10
        );


    const chart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels:
                        sorted.map(
                            function (item) {
                                return item[0];
                            }
                        ),

                    datasets: [

                        {

                            label:
                                "Count",

                            data:
                                sorted.map(
                                    function (item) {
                                        return item[1];
                                    }
                                )

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    indexAxis:
                        "y"

                }

            }
        );


    state.charts.push(
        chart
    );

}


/* =====================================================
   TREEMAP
===================================================== */

function createTreemap(
    firstColumn,
    secondColumn
) {

    if (
        typeof Plotly ===
        "undefined"
    ) {

        return;
    }


    const card =
        createChartCard(
            `Treemap — ${firstColumn} / ${secondColumn}`,
            "Hierarchy of two categorical columns"
        );


    if (!card) {
        return;
    }


    const plot =
        document.createElement(
            "div"
        );


    plot.className =
        "plotly-container";


    card.appendChild(
        plot
    );


    const parentTotals = {};

    const childLabels = [];

    const childParents = [];

    const childValues = [];


    state.data.forEach(
        function (row) {

            const parent =
                String(
                    row[firstColumn] ??
                    "Unknown"
                );

            const child =
                String(
                    row[secondColumn] ??
                    "Unknown"
                );


            parentTotals[parent] =
                (
                    parentTotals[parent] ||
                    0
                ) + 1;


            childLabels.push(
                parent +
                " → " +
                child
            );

            childParents.push(
                parent
            );

            childValues.push(
                1
            );

        }
    );


    const labels = [
        ...childLabels,
        ...Object.keys(parentTotals)
    ];


    const parents = [
        ...childParents,
        ...Object.keys(parentTotals)
            .map(
                function () {
                    return "";
                }
            )
    ];


    const values = [
        ...childValues,
        ...Object.values(parentTotals)
    ];


    const ids = labels.map(
        function (label, index) {

            if (
                index <
                childLabels.length
            ) {

                return "child-" +
                    index;

            }

            return "parent-" +
                index;

        }
    );


    Plotly.newPlot(
        plot,
        [
            {

                type:
                    "treemap",

                ids:
                    ids,

                labels:
                    labels,

                parents:
                    parents,

                values:
                    values

            }
        ],
        {
            margin: {
                t: 10,
                l: 10,
                r: 10,
                b: 10
            }
        },
        {
            responsive: true,
            displayModeBar: false
        }
    );


    state.charts.push({
        kind: "plotly",
        element: plot
    });

}


/* =====================================================
   SUNBURST
===================================================== */

function createSunburst(
    firstColumn,
    secondColumn
) {

    if (
        typeof Plotly ===
        "undefined"
    ) {

        return;
    }


    const card =
        createChartCard(
            `Sunburst — ${firstColumn} / ${secondColumn}`,
            "Nested categorical distribution"
        );


    if (!card) {
        return;
    }


    const plot =
        document.createElement(
            "div"
        );


    plot.className =
        "plotly-container";


    card.appendChild(
        plot
    );


    const group = {};


    state.data.forEach(
        function (row) {

            const first =
                String(
                    row[firstColumn] ??
                    "Unknown"
                );

            const second =
                String(
                    row[secondColumn] ??
                    "Unknown"
                );


            if (!group[first]) {

                group[first] =
                    {};

            }


            group[first][second] =
                (
                    group[first][second] ||
                    0
                ) + 1;

        }
    );


    const labels = [];

    const parents = [];

    const values = [];

    const ids = [];


    Object.entries(group).forEach(
        function ([parent, children]) {

            const parentId =
                "sun-" +
                parent;


            const total =
                Object.values(
                    children
                ).reduce(
                    function (
                        sum,
                        value
                    ) {

                        return sum + value;

                    },
                    0
                );


            labels.push(
                parent
            );

            parents.push(
                ""
            );

            values.push(
                total
            );

            ids.push(
                parentId
            );


            Object.entries(children).forEach(
                function ([child, count]) {

                    labels.push(
                        child
                    );

                    parents.push(
                        parentId
                    );

                    values.push(
                        count
                    );

                    ids.push(
                        parentId +
                        "-" +
                        child
                    );

                }
            );

        }
    );


    Plotly.newPlot(
        plot,
        [
            {

                type:
                    "sunburst",

                ids:
                    ids,

                labels:
                    labels,

                parents:
                    parents,

                values:
                    values

            }
        ],
        {
            margin: {
                t: 10,
                l: 10,
                r: 10,
                b: 10
            }
        },
        {
            responsive: true,
            displayModeBar: false
        }
    );


    state.charts.push({
        kind: "plotly",
        element: plot
    });

}


/* =====================================================
   LINE CHART
===================================================== */

function createLine(
    dateColumn,
    numericColumn
) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        return;
    }


    const canvas =
        createCanvasCard(
            `Line Chart — ${numericColumn} over ${dateColumn}`,
            "Numeric values over time"
        );


    if (!canvas) {
        return;
    }


    const points =
        state.data
            .filter(
                function (row) {

                    return (
                        isDateLike(
                            row[dateColumn]
                        ) &&
                        isNumeric(
                            row[numericColumn]
                        )
                    );

                }
            )
            .map(
                function (row) {

                    return {

                        date:
                            new Date(
                                row[dateColumn]
                            ),

                        value:
                            Number(
                                row[numericColumn]
                            )

                    };

                }
            )
            .sort(
                function (a, b) {

                    return (
                        a.date -
                        b.date
                    );

                }
            );


    const chart =
        new Chart(
            canvas,
            {

                type:
                    "line",

                data: {

                    labels:
                        points.map(
                            function (point) {

                                return point.date
                                    .toLocaleDateString();

                            }
                        ),

                    datasets: [

                        {

                            label:
                                numericColumn,

                            data:
                                points.map(
                                    function (point) {

                                        return point.value;

                                    }
                                ),

                            tension:
                                0.3,

                            fill:
                                false

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );


    state.charts.push(
        chart
    );

}


/* =====================================================
   HELPERS
===================================================== */

function isNumeric(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return false;
    }


    return (
        typeof value === "number" &&
        Number.isFinite(value)
    ) ||
    (
        typeof value === "string" &&
        value.trim() !== "" &&
        Number.isFinite(
            Number(value)
        )
    );

}


function isDateLike(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return false;
    }


    if (
        typeof value === "number"
    ) {

        return false;
    }


    const text =
        String(value).trim();


    if (
        text === "" ||
        isNumeric(text)
    ) {

        return false;
    }


    return !Number.isNaN(
        Date.parse(text)
    );

}


function getNumericValues(
    column
) {

    return state.data
        .map(
            function (row) {

                const value =
                    Number(
                        row[column]
                    );

                return value;

            }
        )
        .filter(
            function (value) {

                return Number.isFinite(
                    value
                );

            }
        );

}


function getUniqueValues(
    column
) {

    return [
        ...new Set(
            state.data
                .map(
                    function (row) {

                        return String(
                            row[column] ??
                            ""
                        );

                    }
                )
                .filter(
                    function (value) {

                        return value !== "";

                    }
                )
        )
    ];

}


function getValueCounts(
    column
) {

    const counts = {};


    state.data.forEach(
        function (row) {

            const value =
                String(
                    row[column] ??
                    ""
                );


            if (!value) {
                return;
            }


            counts[value] =
                (
                    counts[value] ||
                    0
                ) + 1;

        }
    );


    return counts;

}


function updateElement(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}