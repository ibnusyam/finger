import { Fragment, useState, useEffect } from "react";
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export function LogFinger() {
  // Default tanggal hari ini (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  
  const [tableRows, setTableRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [totalColumns, setTotalColumns] = useState(16);

  // Definisi lebar kolom agar sticky presisi
  const WIDTH_NO = "50px";
  const WIDTH_NIK = "100px";
  const WIDTH_NAMA = "150px";
  // Posisi left dihitung akumulasi dari lebar sebelumnya
  const POS_NO = "0px";
  const POS_NIK = "50px"; 
  const POS_NAMA = "150px"; // 50 + 100

  // Fungsi helper untuk memuat script CDN
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const handleExportPDF = async () => {
    if (tableRows.length === 0) {
      alert("Tidak ada data untuk diexport");
      return;
    }

    try {
      setLoading(true);
      // 1. Load Library jsPDF dan AutoTable dari CDN
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js");

      // 2. Inisialisasi Dokumen
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape, milimeter, A4

      // 3. Susun Header Kompleks untuk PDF
      const head = [
        [
          { content: 'No', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
          { content: 'NIK', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
          { content: 'NAMA', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
          { content: `Log Finger (${selectedDate})`, colSpan: totalColumns, styles: { halign: 'center', fontStyle: 'bold' } }
        ],
        [], // Baris 2 (Masuk/Keluar) akan diisi loop
        []  // Baris 3 (Angka) akan diisi loop
      ];

      // Isi Baris 2 (Masuk/Keluar)
      for (let i = 0; i < totalColumns / 2; i++) {
        head[1].push({ content: 'Masuk', styles: { halign: 'center' } });
        head[1].push({ content: 'Keluar', styles: { halign: 'center' } });
      }

      // Isi Baris 3 (Angka 1-N)
      for (let i = 0; i < totalColumns; i++) {
        head[2].push({ content: (i + 1).toString(), styles: { halign: 'center' } });
      }

      // 4. Susun Data Body
      const body = tableRows.map(row => [
        row.no,
        row.nik,
        row.nama,
        ...row.logs
      ]);

      // 5. Generate Tabel
      doc.autoTable({
        head: head,
        body: body,
        startY: 20,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Warna biru header
        columnStyles: {
          0: { cellWidth: 10 }, // No
          1: { cellWidth: 20 }, // NIK
          2: { cellWidth: 40 }  // Nama
          // Sisanya auto
        },
        margin: { top: 20 }
      });

      // Tambahkan Judul di atas
      doc.setFontSize(14);
      doc.text("Laporan Log Finger", 14, 15);

      // 6. Simpan File
      doc.save(`Laporan_Log_Finger_${selectedDate}.pdf`);

    } catch (error) {
      console.error("Gagal export PDF:", error);
      alert("Terjadi kesalahan saat membuat PDF");
    } finally {
      setLoading(false);
    }
  };

  // Helper untuk format waktu dari ISO string
  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const handleSearch = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: selectedDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data");
      }

      const data = await response.json();

      const maxScanCount = data.length > 0 
        ? Math.max(...data.map(item => item.timestamps.length)) 
        : 0;

      let calculatedCols = Math.max(16, maxScanCount);
      if (calculatedCols % 2 !== 0) {
        calculatedCols += 1;
      }
      setTotalColumns(calculatedCols);

      const formattedData = data.map((item, index) => {
        const logs = Array(calculatedCols).fill("");
        item.timestamps.forEach((ts, i) => {
            if (i < calculatedCols) {
                logs[i] = formatTime(ts);
            }
        });

        return {
          no: index + 1,
          nik: item.nik,
          nama: item.full_name,
          logs: logs,
        };
      });

      setTableRows(formattedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setTableRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="relative flex flex-col h-full w-full mt-8">
        
        {/* Kontrol Input & Tombol */}
        <div className="mb-4 w-full bg-white shadow-sm border border-gray-200 rounded-xl z-30 relative">
          <div className="flex flex-wrap items-end gap-4 p-4">
            <div className="w-full md:w-72 bg-white rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pilih Tanggal
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="peer w-full h-full bg-transparent text-blue-gray-700 font-sans font-normal outline outline-0 focus:outline-0 disabled:bg-blue-gray-50 disabled:border-0 transition-all placeholder-shown:border placeholder-shown:border-blue-gray-200 placeholder-shown:border-t-blue-gray-200 border focus:border-2 border-t-transparent focus:border-t-transparent text-sm px-3 py-2.5 rounded-[7px] border-blue-gray-200 focus:border-gray-900"
                />
              </div>
            </div>
            
            {/* Tombol Cari */}
            <button 
                onClick={handleSearch} 
                className="flex items-center gap-3 bg-blue-600 text-white px-6 py-2.5 rounded-lg shadow hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
                disabled={loading}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <MagnifyingGlassIcon strokeWidth={2} className="h-4 w-4" />
              )}
              {loading ? "Memuat..." : "Cari Data"}
            </button>

            {/* Tombol Export PDF Baru */}
            <button 
                onClick={handleExportPDF} 
                className="flex items-center gap-3 bg-green-600 text-white px-6 py-2.5 rounded-lg shadow hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none ml-auto md:ml-0"
                disabled={loading || tableRows.length === 0}
            >
              <ArrowDownTrayIcon strokeWidth={2} className="h-4 w-4" />
              Export PDF
            </button>

          </div>
        </div>

        {/* Tabel */}
        <div className="relative flex flex-col bg-clip-border rounded-xl bg-white text-gray-700 shadow-md h-full w-full overflow-hidden border border-gray-200">
          <div className="p-0 overflow-scroll">
            <table className="w-full min-w-max table-auto text-left border-collapse">
              <thead>
                <tr>
                  {/* Sticky Header Columns */}
                  <th 
                    rowSpan={3} 
                    className="border border-gray-200 bg-gray-50 p-4 text-center sticky z-20 top-0"
                    style={{ left: POS_NO, width: WIDTH_NO, minWidth: WIDTH_NO }}
                  >
                    <p className="block antialiased font-sans text-sm text-blue-gray-900 font-bold leading-none opacity-70">
                      No
                    </p>
                  </th>
                  <th 
                    rowSpan={3} 
                    className="border border-gray-200 bg-gray-50 p-4 text-center sticky z-20 top-0"
                    style={{ left: POS_NIK, width: WIDTH_NIK, minWidth: WIDTH_NIK }}
                  >
                    <p className="block antialiased font-sans text-sm text-blue-gray-900 font-bold leading-none opacity-70">
                      NIK
                    </p>
                  </th>
                  <th 
                    rowSpan={3} 
                    className="border border-gray-200 bg-gray-50 p-4 text-center sticky z-20 top-0 shadow-[4px_0_4px_-2px_rgba(0,0,0,0.1)]"
                    style={{ left: POS_NAMA, width: WIDTH_NAMA, minWidth: WIDTH_NAMA }}
                  >
                    <p className="block antialiased font-sans text-sm text-blue-gray-900 font-bold leading-none opacity-70">
                      NAMA
                    </p>
                  </th>
                  <th colSpan={totalColumns} className="border border-gray-200 bg-gray-50/50 p-2 text-center">
                    <p className="block antialiased font-sans text-sm text-blue-gray-900 font-bold leading-none opacity-70">
                      Log Finger ({selectedDate})
                    </p>
                  </th>
                </tr>

                <tr>
                  {Array.from({ length: totalColumns / 2 }).map((_, index) => (
                    <Fragment key={`pair-${index}`}>
                      <th className="border border-gray-200 bg-gray-50/50 p-2 text-center min-w-[80px]">
                        <p className="block antialiased font-sans text-sm text-blue-gray-900 font-normal leading-none opacity-70">
                          Masuk
                        </p>
                      </th>
                      <th className="border border-gray-200 bg-gray-50/50 p-2 text-center min-w-[80px]">
                        <p className="block antialiased font-sans text-sm text-blue-gray-900 font-normal leading-none opacity-70">
                          Keluar
                        </p>
                      </th>
                    </Fragment>
                  ))}
                </tr>

                <tr>
                  {Array.from({ length: totalColumns }).map((_, index) => (
                    <th key={index} className="border border-gray-200 bg-gray-50/50 p-1 text-center min-w-[50px]">
                      <p className="block antialiased font-sans text-sm text-blue-gray-900 font-normal leading-none opacity-70">
                        {index + 1}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                   <tr>
                      <td colSpan={totalColumns + 3} className="p-4 text-center text-gray-500 h-32">
                        Mengambil data...
                      </td>
                   </tr>
                ) : tableRows.length > 0 ? (
                  tableRows.map(({ no, nik, nama, logs }, index) => {
                    const isLast = index === tableRows.length - 1;
                    const classes = isLast ? "p-2 border border-gray-200" : "p-2 border border-gray-200 border-b-gray-200";
                    // Class khusus untuk sticky body cells: harus punya background color (bg-white)
                    const stickyClasses = `${classes} sticky z-10 bg-white`;

                    return (
                      <tr key={index} className="hover:bg-gray-50/20">
                        {/* Sticky Body Columns */}
                        <td 
                            className={`${stickyClasses} text-center`}
                            style={{ left: POS_NO, width: WIDTH_NO, minWidth: WIDTH_NO }}
                        >
                          <p className="block antialiased font-sans text-sm leading-normal text-blue-gray-900 font-normal">
                            {no}
                          </p>
                        </td>
                        <td 
                            className={`${stickyClasses} text-center`}
                            style={{ left: POS_NIK, width: WIDTH_NIK, minWidth: WIDTH_NIK }}
                        >
                          <p className="block antialiased font-sans text-sm leading-normal text-blue-gray-900 font-normal">
                            {nik}
                          </p>
                        </td>
                        <td 
                            className={`${stickyClasses} whitespace-nowrap shadow-[4px_0_4px_-2px_rgba(0,0,0,0.1)]`}
                            style={{ left: POS_NAMA, width: WIDTH_NAMA, minWidth: WIDTH_NAMA }}
                        >
                          <p className="block antialiased font-sans text-sm leading-normal text-blue-gray-900 font-normal">
                            {nama}
                          </p>
                        </td>
                        
                        {/* Scrollable Data Columns */}
                        {logs.map((log, logIndex) => (
                          <td key={logIndex} className={`${classes} text-center`}>
                            <p className="block antialiased font-sans text-xs leading-normal text-blue-gray-900 font-normal whitespace-nowrap">
                              {log}
                            </p>
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                     <td colSpan={totalColumns + 3} className="p-8 text-center text-gray-500">
                        <h6 className="block antialiased font-sans text-base leading-relaxed font-semibold text-blue-gray-900">
                            Tidak ada data
                        </h6>
                        <p className="block antialiased font-sans text-sm leading-normal font-normal text-gray-600 mt-1">
                            Silakan pilih tanggal dan klik tombol cari.
                        </p>
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default LogFinger;