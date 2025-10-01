// قاعدة بيانات العائلات
let familiesDatabase = {};

// دالة لتحميل بيانات من ملف Excel
function loadExcelDataFromFile() {
    fetch('./user.xlsx')
        .then(response => {
            if (!response.ok) {
                throw new Error('لم يتم العثور على ملف user.xlsx');
            }
            return response.arrayBuffer();
        })
        .then(data => {
            // ملاحظة: تأكد من تضمين مكتبة XLSX (SheetJS) قبل هذا الكود
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            processExcelData(jsonData);
            
            // العدد الكلي للسجلات هو طول الـ jsonData
            const totalRecords = jsonData.length;
            console.log(`✅ تم تحميل ${totalRecords} سجل بنجاح من ملف Excel`);
            
            updateStats(totalRecords); // تمرير العدد الكلي للسجلات
        })
        .catch(error => {
            console.error('خطأ في تحميل ملف Excel:', error);
            alert("⚠️ لم يتم العثور على ملف user.xlsx أو يوجد خطأ بالتحميل");
        });
}

// دالة لمعالجة بيانات Excel (تخزن كل الأعمدة)
function processExcelData(excelData) {
    familiesDatabase = {};

    excelData.forEach((row, index) => {
        // نستخدم الرقم التسلسلي (العمود الأول 'الرقم') كـ ID إذا كان موجوداً
        const nationalId = row['الرقم'] || row['رقم الوثيقة'] || row['رقم البطاقة الذكية'] || `temp_${index}`;

        familiesDatabase[nationalId] = {
            ...row, // تخزين كل الأعمدة
            status: 'مسجل' // نضيف حالة افتراضية
        };
    });
}

// دالة مساعدة محسنة للتحقق من القيم - للاستخدام في البحث فقط
const isValidHusbandName = (value) => {
    if (value === undefined || value === null) return false;
    const strValue = String(value).trim();
    // نعتبر أي قيمة غير فارغة نصياً هي اسم صالح لأغراض البحث
    return strValue.length > 0;
};


// 💡 دالة تحديث الإحصائيات (المُعدَّلة)
function updateStats(totalRecordsFromExcel) {
    // التحقق من أن قاعدة البيانات محملة
    if (Object.keys(familiesDatabase).length === 0) {
        console.warn("⚠️ قاعدة البيانات فارغة، لا يمكن حساب الإحصائيات.");
        return;
    }

    const familiesArray = Object.values(familiesDatabase);

    // 1. عدد العائلات كاملة (العدد الكلي للسجلات)
    const totalFamilies = totalRecordsFromExcel || familiesArray.length;

    // تحليل مفصل للأسماء في العمود D (لأغراض المراقبة فقط)
    const allHusbandNames = familiesArray.map(family => family['الاسم الثلاثي للزوج']);
    const validNames = allHusbandNames.filter(name => isValidHusbandName(name));
    const invalidNames = allHusbandNames.filter(name => !isValidHusbandName(name));
    
    console.log('🔍 تحليل أسماء الزوج (العمود D):');
    console.log(`    - إجمالي السجلات المُعالجة في الدالة: ${familiesArray.length}`);
    console.log(`    - أسماء صالحة في العمود D: ${validNames.length}`);
    console.log(`    - 💡 العدد الكلي المُستخدم للعائلات: ${totalFamilies}`);
    
    if (invalidNames.length > 0) {
        console.log('    - أمثلة على السجلات التي لا تحتوي على اسم زوج (العمود D):');
        const uniqueInvalid = [...new Set(invalidNames)].slice(0, 5);
        uniqueInvalid.forEach(name => {
            console.log(`      * "${name}"`);
        });
    }

    // 2. ذوي الاحتياجات الخاصة (عمود 'ذوي احتياجات خاصة') - (تصفية لغير الفارغ)
    const specialNeedsCount = familiesArray.filter(family => {
        const value = family['ذوي احتياجات خاصة'];
        return value !== undefined && value !== null && String(value).trim() !== '';
    }).length;

    // 3. أسرة تديرها امرأة (عمود 'اسرة تديرها امرأة') - (تصفية لغير 'لايوجد' وغير الفارغ)
    const femaleLedCount = familiesArray.filter(family => {
        const value = family['اسرة تديرها امرأة'];
        return value !== undefined && value !== null && 
                String(value).trim() !== '' && 
                String(value).trim().toLowerCase() !== 'لايوجد';
    }).length;

    // 4. المصابين (عمود 'مصاب') - (تصفية لغير الفارغ)
    const injuredCount = familiesArray.filter(family => {
        const value = family['مصاب'];
        return value !== undefined && value !== null && String(value).trim() !== '';
    }).length;

    // 5. العاطلين عن العمل (عمود 'العمل الحالي لرب الاسرة') - (تصفية للخلايا الفارغة فقط)
    const unemployedCount = familiesArray.filter(family => {
        const jobField = 'العمل الحالي لرب الاسرة';
  
        
        const value = family[jobField];
        
        return value === undefined || value === null || String(value).trim() === '';
        
    }).length;


    // 6. عدد الأيتام (مجموع الأيتام حسب عمود 'عدد ايتام')
    const totalOrphans = familiesArray.reduce((sum, family) => {
        const orphans = parseInt(family['عدد ايتام']) || 0;
        return sum + orphans;
    }, 0);

    // 💡 تحديث أرقام الكروت في الواجهة باستخدام الـ ID
    document.getElementById('totalFamilies').textContent = totalFamilies.toLocaleString('ar-EG');
    document.getElementById('specialNeedsFamilies').textContent = specialNeedsCount.toLocaleString('ar-EG');
    document.getElementById('femaleLedFamilies').textContent = femaleLedCount.toLocaleString('ar-EG');
    document.getElementById('injuredFamilies').textContent = injuredCount.toLocaleString('ar-EG');
    document.getElementById('unemployedFamilies').textContent = unemployedCount.toLocaleString('ar-EG');
    document.getElementById('orphansFamilies').textContent = totalOrphans.toLocaleString('ar-EG');
    
    console.log(`✅ تم تحديث إحصائيات الكروت بنجاح`);
    console.log(`👨‍👩‍👧‍👦 العدد الكلي للعائلات (العدد الفعلي للصفوف): ${totalFamilies}`);
}

// تحميل البيانات تلقائياً عند فتح الصفحة
document.addEventListener('DOMContentLoaded', function () {
    console.log('📥 جاري تحميل بيانات العائلات من ملف Excel...');
    loadExcelDataFromFile();
});

// ------------------------------------------------------------------
// دوال البحث والعرض (بدون تغيير في هذا الجزء)
// ------------------------------------------------------------------

// البحث
function performSearch() {
    const searchValue = document.getElementById('searchInput').value.trim();
    const resultsSection = document.getElementById('resultsSection');
    const loading = document.getElementById('loading');

    if (!searchValue) {
        alert('يرجى إدخال بيانات للبحث');
        return;
    }

    if (Object.keys(familiesDatabase).length === 0) {
        alert('جاري تحميل البيانات... يرجى الانتظار قليلاً');
        return;
    }

    loading.style.display = 'block';
    resultsSection.style.display = 'none';

    setTimeout(() => {
        const result = searchInDatabase(searchValue);
        showSearchResult(result, searchValue);
        loading.style.display = 'none';
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
}

// البحث فقط برقم الوثيقة أو رقم التواصل
function searchInDatabase(searchValue) {
    for (const nationalId in familiesDatabase) {
        const family = familiesDatabase[nationalId];
        // مقارنة برقم الوثيقة أو رقم التواصل
        if (family['رقم الوثيقة'] == searchValue || family['التواصل'] == searchValue) {
            return family;
        }
    }
    return null;
}

// عرض النتائج (كل الأعمدة)
function showSearchResult(result, searchTerm) {
    const resultsSection = document.getElementById('resultsSection');
    let resultHTML = '';

    if (result) {
        const statusClass = result.status === 'مسجل' ? 'success' : 'warning';
        const statusIcon = result.status === 'مسجل' ? 'fa-check-circle' : 'fa-exclamation-circle';

        // التحقق إذا كانت العائلة تحتوي على اسم الزوج في العمود D
        const hasHusbandName = isValidHusbandName(result['الاسم الثلاثي للزوج']);
        
        // نبني التفاصيل لكل الأعمدة
        let detailsHTML = '';
        
        // الحصول على جميع المفاتيح لعرض كل البيانات
        const allColumns = Object.keys(result);
        
        // نحذف مفتاح "status" المضاف داخليًا من العرض التفصيلي
        const columnsToShow = allColumns.filter(key => key !== 'status');

        // عرض جميع الأعمدة التي تم تحميلها
        columnsToShow.forEach(key => {
            if (result[key] !== undefined) {
                // قيمة التنسيق: للتأكد من عرض 'غير محدد' إذا كانت القيمة فارغة (null/undefined/''/0)
                const displayValue = (result[key] === null || result[key] === '' || result[key] === 0) 
                                     ? 'غير محدد' 
                                     : result[key];

                detailsHTML += `
                    <div class="detail-item">
                        <div class="detail-label">${key}</div>
                        <div class="detail-value">${displayValue}</div>
                    </div>
                `;
            }
        });

        resultHTML = `
            <div class="result-card ${statusClass}">
                <div class="result-header">
                    <div class="result-icon">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                    <div>
                        <div class="result-title">${result.status} في النظام</div>
                        <p>عائلتك ${result.status === 'مسجل' ? 'مسجلة' : 'تحت المراجعة'} في سجلات اللجنة</p>
                        ${!hasHusbandName ? '<p class="warning-text">⚠️ ملاحظة: هذه العائلة لا تحتوي على اسم الزوج في العمود D</p>' : ''}
                    </div>
                </div>
                <div class="result-details">
                    ${detailsHTML}
                </div>
                <div class="permission-note">
                    <i class="fas fa-info-circle"></i>
                    <p>هذه خدمة استعلام فقط - للتعديل يرجى مراجعة مقر اللجنة</p>
                </div>
            </div>
        `;
    } else {
        resultHTML = `
            <div class="result-card error">
                <div class="result-header">
                    <div class="result-icon"><i class="fas fa-times-circle"></i></div>
                    <div>
                        <div class="result-title">غير مسجل</div>
                        <p>لم نتمكن من العثور على تسجيل للعائلة</p>
                    </div>
                </div>
                <div class="result-details">
                    <div class="detail-item">
                        <div class="detail-label">بيانات البحث</div>
                        <div class="detail-value">${searchTerm}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">نصيحة</div>
                        <div class="detail-value">تأكد من رقم الوثيقة أو رقم الهاتف</div>
                    </div>
                </div>
            </div>
        `;
    }
    resultsSection.innerHTML = resultHTML;
}

// أمثلة البحث
function fillExample(type) {
    const examples = {
        'registered': Object.keys(familiesDatabase)[0] || '',
        'notRegistered': '000000'
    };
    document.getElementById('searchInput').value = examples[type];
}

// البحث بالـ Enter
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') performSearch();
});