"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`, [
        this.firstName,
        this.lastName,
        this.phone,
        this.notes,
        this.id,
      ],
      );
    }
  }

  /** @returns a string that contains the first and last name.*/

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** returns list of customer instances
   * that have a similar first or last name to the name passed in. */
  static async search(name) {
    const results = await db.query(
      `SELECT id,
              first_name AS "firstName",
              last_name  AS "lastName",
              phone,
              notes
      FROM customers
      WHERE first_name ILIKE $1 OR last_name ILIKE $1
      ORDER BY last_name, first_name`,
      [`%${name}%`]);

    return results.rows.map(c => new Customer(c));
  }

  /**
   * returns a list of howMany customers sorted by descending
   * number of reservations
   * @param {number} howMany int
   * @returns {Customer[]}
   */
  static async getBest(howMany) {
    const results = await db.query(
      `SELECT c.id,
      c.first_name AS "firstName",
      c.last_name  AS "lastName",
      c.phone,
      c.notes,
      COUNT(*)
      FROM customers as c
      JOIN reservations ON customer_id = c.id
      GROUP BY c.id
      ORDER BY COUNT(*) DESC LIMIT $1;`,
      [howMany]
    );

    return results.rows.map(c => new Customer(c));
  }
}

module.exports = Customer;
