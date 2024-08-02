const renderTemplate = require('../controllers/renderTemplate');
const mongoose = require('mongoose');

//routes setting
const setupRoutes = (fastify) => {
  fastify.decorate("authenticate", async function (req, reply) {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
//CRUD, need to optimize this part
  fastify.get('/ping', {
    schema: {
      description: 'Ping route to check the server status',
      tags: ['utility'],
      response: {
        200: {
          type: 'string',
          example: 'pong 🏓'
        }
      }
    }
  }, async (req, reply) => {
    reply.send('pong 🏓');
  });

  fastify.get('/', {
    schema: {
      description: 'Get all companies',
      tags: ['company'],
      querystring: {
        name: { type: 'string' },
        address: { type: 'string' }
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              phone: { type: 'string' },
              logo: { type: 'string' },
              slug: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { name, address } = req.query;
      const filter = {};
      if (name) filter.name = new RegExp(name, 'i');
      if (address) filter.address = new RegExp(address, 'i');

      const Company = mongoose.model('Company');
      const data = await Company.find(filter);
      reply.status(200).send(data);
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.get('/:slug/*', {
    schema: {
      description: 'Render template based on slug',
      tags: ['template'],
      params: {
        slug: { type: 'string' }
      },
      response: {
        200: {
          type: 'string'
        }
      }
    }
  }, async (req, reply) => {
    await renderTemplate(req, reply);
  });

  fastify.get('/templates', {
    schema: {
      description: 'Get all templates',
      tags: ['template'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              template_name: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const Template = mongoose.model('Template');
      const templates = await Template.find();
      reply.send(templates);
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.post('/company', {
    preValidation: [fastify.authenticate],
    schema: {
      description: 'Create a new company',
      tags: ['company'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          logo: { type: 'string' },
          slug: { type: 'string' },
          theme: { type: 'object' },
          sections: { type: 'array' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            logo: { type: 'string' },
            slug: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const Company = mongoose.model('Company');
      const company = new Company(req.body);
      await company.save();
      reply.status(201).send(company);
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.get('/company/:id', {
    schema: {
      description: 'Get a company by ID',
      tags: ['company'],
      params: {
        id: { type: 'string' }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            logo: { type: 'string' },
            slug: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const Company = mongoose.model('Company');
      const company = await Company.findById(req.params.id);
      if (!company) {
        reply.status(404

).send('Not Found');
        return;
      }
      reply.send(company);
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.get('/company/:id/sections', {
    schema: {
      description: 'Get sections of a company by company ID',
      tags: ['company'],
      params: {
        id: { type: 'string' }
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object'
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const Company = mongoose.model('Company');
      const company = await Company.findById(req.params.id);
      if (!company) {
        reply.status(404).send('Not Found');
        return;
      }
      reply.send(company.sections);
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.post('/company/upload', {
    preValidation: [fastify.authenticate],
    schema: {
      description: 'Upload company data',
      tags: ['company'],
      response: {
        200: {
          type: 'array',
          items: { type: 'object' }
        }
      }
    },
    handler: async (req, reply) => {
      const data = await req.file();
      const buffer = await data.toBuffer();
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.sheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      reply.send(sheetData);
    }
  });

  fastify.post('/company/create-template', {
    preValidation: [fastify.authenticate],
    schema: {
      description: 'Create a template from uploaded data',
      tags: ['template'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            template: { type: 'object' }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const sheetData = req.session.sheetData;
      if (!sheetData) {
        return reply.status(400).send({ error: 'No uploaded file data found' });
      }
      const Template = mongoose.model('Template');
      const template = await Template.create(sheetData);
      reply.send({ message: 'Template created', template });
    }
  });

  fastify.put('/company/:id', {
    preValidation: [fastify.authenticate],
    schema: {
      description: 'Update a company by ID',
      tags: ['company'],
      params: {
        id: { type: 'string' }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          logo: { type: 'string' },
          slug: { type: 'string' },
          theme: { type: 'object' },
          sections: { type: 'array' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            logo: { type: 'string' },
            slug: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const Company = mongoose.model('Company');
      const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!company) {
        reply.status(404).send('Not Found');
        return;
      }
      reply.send(company);
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.put('/company/:id/sections', {
    preValidation: [fastify.authenticate],
    schema: {
      description: 'Add a section to a company by ID',
      tags: ['company'],
      params: {
        id: { type: 'string' }
      },
      body: {
        type: 'object',
        properties: {
          template: { type: 'object' },
          data: { type: 'object' },
          order: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            logo: { type: 'string' },
            slug: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const Company = mongoose.model('Company');
      const company = await Company.findById(req.params.id);
      if (!company) {
        reply.status(404).send('Not Found');
        return;
      }
      const Section = mongoose.model('Section');
      const section = new Section(req.body);
      company.sections.push(section);
      await company.save();
      reply.send(company);
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.delete('/company/:id', {
    preValidation: [fastify.authenticate],
    schema: {
      description: 'Delete a company by ID',
      tags: ['company'],
      params: {
        id: { type: 'string' }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const Company = mongoose.model('Company');
      const company = await Company.findByIdAndDelete(req.params.id);
      if (!company) {
        reply.status(404).send('Not Found');
        return;
      }
      reply.send({ message: 'Company deleted' });
    } catch (err) {
      reply.status(500).send(err);
    }
  });

  fastify.get('/render/:id', {
    schema: {
      description: 'Render company by slug',
      tags: ['template'],
      params: {
        id: { type: 'string' }
      },
      response: {
        200: {
          type: 'string'
        }
      }
    }
  }, async (req, reply) => {
    const Company = mongoose.model('Company');
    const company = await Company.findOne({ slug: req.params.id }).lean();
    const data = {
      sections: company.sections.map(e => ({
        ...e,
        temp_location: e.template.category + '/' + e.template.template_name,
      })),
      company
    };
    return reply.viewAsync('views/render.ejs', data);
  });
};

module.exports = setupRoutes;
