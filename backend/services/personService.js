'use strict';

const { db } = require('../db/connection');

const QUERY = `
SELECT p.person_name,
       COALESCE(r.lentTotal, 0)     AS lentTotal,
       COALESCE(r.receivedBack, 0)  AS receivedBack,
       COALESCE(b.borrowedTotal, 0) AS borrowedTotal,
       COALESCE(b.returned, 0)      AS returned
FROM (
  SELECT person_name FROM transactions WHERE person_name IS NOT NULL AND person_name != ''
  UNION
  SELECT person_name FROM money_to_receive WHERE person_name IS NOT NULL AND person_name != ''
  UNION
  SELECT person_name FROM money_to_pay WHERE person_name IS NOT NULL AND person_name != ''
) p
LEFT JOIN (
  SELECT person_name,
         SUM(original_amount) AS lentTotal,
         SUM(received_amount) AS receivedBack
  FROM money_to_receive GROUP BY person_name
) r ON r.person_name = p.person_name
LEFT JOIN (
  SELECT person_name,
         SUM(original_amount) AS borrowedTotal,
         SUM(paid_amount)     AS returned
  FROM money_to_pay GROUP BY person_name
) b ON b.person_name = p.person_name
ORDER BY p.person_name COLLATE NOCASE ASC`;

/**
 * Distinct persons with per-person debt aggregates.
 * balanceNet = netToReceive - netToPay (positive = we expect to receive more).
 */
function getPersons() {
  const rows = db.prepare(QUERY).all();
  return rows.map((r) => {
    const lentTotal = r.lentTotal || 0;
    const receivedBack = r.receivedBack || 0;
    const borrowedTotal = r.borrowedTotal || 0;
    const returned = r.returned || 0;
    const netToReceive = lentTotal - receivedBack;
    const netToPay = borrowedTotal - returned;
    return {
      person_name: r.person_name,
      lentTotal,
      receivedBack,
      netToReceive,
      borrowedTotal,
      returned,
      netToPay,
      balanceNet: netToReceive - netToPay,
    };
  });
}

module.exports = { getPersons };